"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { styleDbToKey, styleLabel, computeRemainingBalance } from "@/lib/mappers"
import { parseISODate, toISODate, isSessionActiveOn } from "@/lib/schedule-dates"
import type { Prisma, DanceStyle } from "@/lib/generated/prisma/client"

// Every exported action below returns this instead of throwing its error
// code across the client boundary. Next.js redacts a thrown Error's message
// once it crosses a Server Action's client/server boundary in a *production*
// build — the client only ever gets a generic message + digest, even though
// the real message ("ALREADY_BOOKED", "NO_VALID_CARD", ...) still shows up
// fine in `next dev` and in the server-side log. That mismatch is exactly
// why this worked in local testing and broke silently once deployed: the
// caller's `e.message === "ALREADY_BOOKED"` check never matches in prod, so
// it always falls through to the generic error text. Returning the code as
// plain data instead sidesteps that redaction entirely. See errorResult.
export type ActionResult = { ok: true } | { ok: false; error: string }

// Codes the UI is actually prepared to branch on. Anything else (a DB
// hiccup, a genuine bug) is logged here — since it's caught and returned
// rather than left to throw, Next.js's own logging no longer sees it — and
// collapsed to "UNKNOWN" for the client rather than leaking internals.
const KNOWN_ERROR_CODES = new Set([
  "NO_VALID_CARD",
  "SESSION_NOT_ACTIVE",
  "ALREADY_BOOKED",
  "NO_LINKED_STUDENT",
  "FORBIDDEN",
  "NOT_FOUND",
])

function errorResult(e: unknown): { ok: false; error: string } {
  const code = e instanceof Error ? e.message : ""
  if (!KNOWN_ERROR_CODES.has(code)) {
    console.error("[bookings]", e)
    return { ok: false, error: "UNKNOWN" }
  }
  return { ok: false, error: code }
}

// Picks which of the student's cards a booking should draw a credit from:
// the non-unlimited, non-expired card with the soonest expiry (use the one
// closest to running out first), falling back to an unlimited card if no
// timed card is available. Returns null if the student has no valid card.
async function pickConsumableCard(tx: Prisma.TransactionClient, studentId: string) {
  const now = new Date()
  const timed = await tx.studentCard.findFirst({
    where: { studentId, isUnlimited: false, balance: { gt: 0 }, expiry: { gt: now } },
    orderBy: { expiry: "asc" },
  })
  if (timed) return timed
  return tx.studentCard.findFirst({ where: { studentId, isUnlimited: true, expiry: { gt: now } } })
}

// Consumes one class credit for a booking that's becoming BOOKED — shared
// by a fresh booking (bookOccurrenceForStudent) and waitlist promotion
// (cancelOccurrenceForStudent), since both need identical card-selection
// and ledger-writing rules. Throws NO_VALID_CARD without writing anything
// if the student has nothing to draw from, so callers can safely treat
// that as "this candidate can't be promoted" rather than a hard failure.
//
// `allowNegative` is admin-only (see adminBookStudent) — staff registering
// someone who's simply out of credits, after an explicit confirm, rather
// than turning them away. It skips the balance check below and always
// leaves a real, visible trace: a cardless CONSUME entry that pushes the
// student's computed balance negative, the same way a legacy cardless
// student's balance already can, rather than force-decrementing an actual
// StudentCard below zero or past its own expiry.
async function consumeCreditForBooking(
  tx: Prisma.TransactionClient,
  studentId: string,
  bookingId: string,
  session: { style: DanceStyle; teacher: { name: string; nameEn: string } },
  opts: { allowNegative?: boolean } = {},
) {
  const card = await pickConsumableCard(tx, studentId)
  let cardId: string | null = null
  if (card) {
    if (!card.isUnlimited) {
      await tx.studentCard.update({ where: { id: card.id }, data: { balance: { decrement: 1 } } })
    }
    cardId = card.id
  } else {
    // No live StudentCard to draw from — still allow it if the student's
    // overall computed balance (剩余课时, the same number shown everywhere
    // in the app) is positive. This is the normal case for legacy-migrated
    // students: their whole card history lives only in ledger_entries,
    // since the migration never created StudentCard rows for them. Consume
    // the same way, via a cardless CONSUME entry — cancelling later refunds
    // it identically (see cancelOccurrenceForStudent, which already treats
    // cardId-null entries as "nothing to refund on the card side").
    const [cards, ledgerEntries] = await Promise.all([
      tx.studentCard.findMany({ where: { studentId } }),
      tx.ledgerEntry.findMany({ where: { studentId } }),
    ])
    if (computeRemainingBalance(cards, ledgerEntries) <= 0 && !opts.allowNegative) throw new Error("NO_VALID_CARD")
  }
  const label = styleLabel(styleDbToKey(session.style))
  await tx.ledgerEntry.upsert({
    where: { bookingId },
    create: {
      studentId,
      cardId,
      bookingId,
      kind: "CONSUME",
      titleZh: `${label.zh} · ${session.teacher.name}`,
      titleEn: `${label.en} · ${session.teacher.nameEn}`,
      date: new Date(),
      delta: -1,
    },
    update: {},
  })
}

// Shared core behind bookClass (self-service) and adminBookStudent (staff
// registering someone on their behalf) — same card-consumption mechanics
// either way, but capacity/waitlist enforcement is opt-out via `forceBooked`
// (see adminBookStudent for why the admin path always sets it).
//
// `allowDuplicate` gates a student already having an active (BOOKED/
// WAITLIST) booking for this exact occurrence — normally that's surfaced as
// ALREADY_BOOKED so the caller can confirm first, but a student sometimes
// brings a friend along without getting them their own account and wants to
// 接龙 under their own name a second time. Passing `allowDuplicate: true`
// (only after that confirmation) skips the check and books another
// independent row — its own credit deduction, its own cancel — same as if
// it were a different student, right up until they run out of credits
// (consumeCreditForBooking throws NO_VALID_CARD same as always).
//
// `allowNegativeBalance` is the same confirm-first pattern for running out
// of credits entirely — admin-only (bookClass never sets it; self-service
// booking always hard-stops at NO_VALID_CARD), see adminBookStudent.
async function bookOccurrenceForStudent(
  sessionId: string,
  date: string,
  studentId: string,
  opts: { forceBooked?: boolean; allowDuplicate?: boolean; allowNegativeBalance?: boolean } = {},
) {
  const occurrenceDate = parseISODate(date)
  return prisma.$transaction(async (tx) => {
    // Row-lock the session so concurrent bookers of the same session
    // serialize instead of racing past capacity.
    await tx.$executeRaw`SELECT id FROM class_sessions WHERE id = ${sessionId} FOR UPDATE`

    const session = await tx.classSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { teacher: true },
    })

    // Structural check, not a policy one — unlike capacity/waitlisting,
    // there's no override for this: if the occurrence doesn't exist (past
    // the session's own lifetime, or paused by a closure), there's nothing
    // to book regardless of who's booking.
    const closures = await tx.classClosure.findMany({
      where: { OR: [{ sessionId: null }, { sessionId }] },
      select: { sessionId: true, startDate: true, endDate: true },
    })
    const isActive = isSessionActiveOn(
      {
        id: session.id,
        startDate: session.startDate ? toISODate(session.startDate) : null,
        endDate: session.endDate ? toISODate(session.endDate) : null,
      },
      closures.map((c) => ({ sessionId: c.sessionId, startDate: toISODate(c.startDate), endDate: toISODate(c.endDate) })),
      date,
    )
    if (!isActive) throw new Error("SESSION_NOT_ACTIVE")

    if (!opts.allowDuplicate) {
      const existing = await tx.booking.findFirst({
        where: { studentId, sessionId, date: occurrenceDate, state: { in: ["BOOKED", "WAITLIST"] } },
      })
      if (existing) throw new Error("ALREADY_BOOKED")
    }

    let state: "BOOKED" | "WAITLIST"
    if (opts.forceBooked) {
      state = "BOOKED"
    } else {
      const bookedCount = await tx.booking.count({ where: { sessionId, date: occurrenceDate, state: "BOOKED" } })
      state = bookedCount < session.capacity ? "BOOKED" : "WAITLIST"
    }

    // Always a fresh row, never reused — with no unique constraint on
    // (studentId, sessionId, date) any more, there's no reason to upsert
    // onto a prior CANCELED row the way this used to. Every 接龙, including
    // a repeat one under the same studentId, gets its own id, its own
    // createdAt (接龙 chain order, roster 报名时间, waitlist promotion order
    // — see getBookedNamesForSession/promoteFromWaitlist), and its own
    // ledger entry/cancel.
    const booking = await tx.booking.create({
      data: { studentId, sessionId, date: occurrenceDate, state },
    })

    if (state === "BOOKED") {
      await consumeCreditForBooking(tx, studentId, booking.id, session, { allowNegative: opts.allowNegativeBalance })
    }

    return booking
  })
}

// `date` is the specific calendar occurrence being booked (ISO
// "YYYY-MM-DD") — a student books one date's instance of a recurring
// session at a time, not the whole weekly series. `allowDuplicate` is set
// only after the student has already been shown and confirmed the
// "already booked, continue anyway?" prompt (see bookOccurrenceForStudent).
export async function bookClass(sessionId: string, date: string, allowDuplicate = false): Promise<ActionResult> {
  const { studentId } = await requireRole("STUDENT")
  if (!studentId) return { ok: false, error: "NO_LINKED_STUDENT" }
  try {
    await bookOccurrenceForStudent(sessionId, date, studentId, { allowDuplicate })
    return { ok: true }
  } catch (e) {
    return errorResult(e)
  }
}

// Admin-side 课时登记 — staff registering a specific student into a specific
// class occurrence on their behalf. Always lands as BOOKED (forceBooked),
// bypassing the capacity/waitlist check self-booking uses: waitlisting
// exists to queue students fairly under uncontrolled self-service demand,
// not to silently no-op an admin's explicit "register this student" action
// — and the legacy-migrated dataset routinely already exceeds a session's
// nominal capacity, so without this an admin could almost never actually
// register (and therefore charge) anyone through this feature.
// `allowDuplicate` mirrors bookClass — set only after the admin confirms
// the same "already on the list, continue?" prompt, for the same
// bring-a-friend-under-one-account case. `allowNegativeBalance` is the
// admin-only escape hatch for a student who's simply out of credits: staff
// can still register them (after confirming) and the balance goes
// negative, unlike bookClass's self-service path, which always hard-stops
// at NO_VALID_CARD with no way around it.
export async function adminBookStudent(
  sessionId: string,
  date: string,
  studentId: string,
  allowDuplicate = false,
  allowNegativeBalance = false,
): Promise<ActionResult> {
  await requireRole("ADMIN")
  try {
    await bookOccurrenceForStudent(sessionId, date, studentId, { forceBooked: true, allowDuplicate, allowNegativeBalance })
    return { ok: true }
  } catch (e) {
    return errorResult(e)
  }
}

// Offers a just-freed BOOKED seat to whoever's been on the waitlist
// longest, skipping anyone who can't actually take it right now (their
// card may have expired, or run out, since they joined the queue — a
// WAITLIST booking was never required to have a valid card, unlike BOOKED)
// rather than leaving the seat stuck behind an ineligible first-in-line
// student. Best-effort: if nobody in the queue is currently eligible, the
// seat just stays open, same as if nobody had been waiting at all.
async function promoteFromWaitlist(tx: Prisma.TransactionClient, sessionId: string, date: Date) {
  const waiting = await tx.booking.findMany({
    where: { sessionId, date, state: "WAITLIST" },
    orderBy: { createdAt: "asc" },
  })
  if (waiting.length === 0) return

  const session = await tx.classSession.findUniqueOrThrow({ where: { id: sessionId }, include: { teacher: true } })

  for (const candidate of waiting) {
    try {
      await consumeCreditForBooking(tx, candidate.studentId, candidate.id, session)
      await tx.booking.update({ where: { id: candidate.id }, data: { state: "BOOKED" } })
      return
    } catch (e) {
      if (e instanceof Error && e.message === "NO_VALID_CARD") continue
      throw e
    }
  }
}

// Names only, in the order students joined — matches the "接龙" (group
// sign-up chain) mental model students already have from chat groups.
export async function getBookedNamesForSession(sessionId: string, date: string): Promise<string[]> {
  await requireRole("STUDENT")
  const bookings = await prisma.booking.findMany({
    where: { sessionId, date: parseISODate(date), state: { in: ["BOOKED", "WAITLIST"] } },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })
  return bookings.map((b) => b.student.name)
}

// Shared core behind cancelBooking (self-service) and adminCancelBooking
// (staff removing someone from the roster) — same refund rules either way.
// Freeing up a BOOKED seat also offers it to whoever's been waiting longest
// (see promoteFromWaitlist) — cancelling a WAITLIST booking doesn't, since
// no real seat was ever occupied.
//
// Targets one specific booking row by id, not (student, session, date) —
// now that a student can hold more than one active booking for the same
// occurrence (see bookOccurrenceForStudent's `allowDuplicate`), cancelling
// has to be able to remove just one of them and leave the others alone,
// exactly the way deleting one roster row already worked for admins.
// `expectedStudentId`, when given, enforces that a self-service cancel can
// only ever hit the caller's own booking, never one looked up by id alone.
async function cancelOccurrenceBooking(bookingId: string, expectedStudentId?: string) {
  const target = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!target) return null
  if (expectedStudentId && target.studentId !== expectedStudentId) throw new Error("FORBIDDEN")
  if (target.state === "CANCELED") return target

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM class_sessions WHERE id = ${target.sessionId} FOR UPDATE`

    const booking = await tx.booking.findUnique({ where: { id: bookingId } })
    if (!booking || booking.state === "CANCELED") return booking

    const wasBooked = booking.state === "BOOKED"

    if (wasBooked) {
      const ledger = await tx.ledgerEntry.findUnique({ where: { bookingId: booking.id } })
      if (ledger) {
        if (ledger.cardId) {
          const card = await tx.studentCard.findUnique({ where: { id: ledger.cardId } })
          if (card && !card.isUnlimited) {
            await tx.studentCard.update({ where: { id: card.id }, data: { balance: { increment: 1 } } })
          }
        }
        await tx.ledgerEntry.delete({ where: { id: ledger.id } })
      }
    }

    const cancelled = await tx.booking.update({ where: { id: booking.id }, data: { state: "CANCELED" } })

    if (wasBooked) {
      await promoteFromWaitlist(tx, booking.sessionId, booking.date)
    }

    return cancelled
  })
}

// Self-service cancel — takes the bookingId shown in 我的预约 directly (one
// row per booking, so a student with more than one active booking for the
// same class cancels them one at a time, same as everyone else's roster).
export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const { studentId } = await requireRole("STUDENT")
  if (!studentId) return { ok: false, error: "NO_LINKED_STUDENT" }
  try {
    const result = await cancelOccurrenceBooking(bookingId, studentId)
    if (!result) return { ok: false, error: "NOT_FOUND" }
    return { ok: true }
  } catch (e) {
    return errorResult(e)
  }
}

// Admin-side removal from the 课时登记 roster — takes the bookingId shown in
// the roster list directly, rather than round-tripping (sessionId, date,
// studentId), since that's exactly what the admin UI already has on hand.
export async function adminCancelBooking(bookingId: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  try {
    const result = await cancelOccurrenceBooking(bookingId)
    if (!result) return { ok: false, error: "NOT_FOUND" }
    return { ok: true }
  } catch (e) {
    return errorResult(e)
  }
}
