"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { styleDbToKey, styleLabel, computeRemainingBalance } from "@/lib/mappers"
import { parseISODate, toISODate, isSessionActiveOn } from "@/lib/schedule-dates"
import type { Prisma } from "@/lib/generated/prisma/client"

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

// Shared core behind bookClass (self-service) and adminBookStudent (staff
// registering someone on their behalf) — same card-consumption mechanics
// either way, but capacity/waitlist enforcement is opt-out via `forceBooked`
// (see adminBookStudent for why the admin path always sets it).
async function bookOccurrenceForStudent(
  sessionId: string,
  date: string,
  studentId: string,
  opts: { forceBooked?: boolean } = {},
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

    let state: "BOOKED" | "WAITLIST"
    if (opts.forceBooked) {
      state = "BOOKED"
    } else {
      const bookedCount = await tx.booking.count({ where: { sessionId, date: occurrenceDate, state: "BOOKED" } })
      state = bookedCount < session.capacity ? "BOOKED" : "WAITLIST"
    }

    const booking = await tx.booking.upsert({
      where: { studentId_sessionId_date: { studentId, sessionId, date: occurrenceDate } },
      create: { studentId, sessionId, date: occurrenceDate, state },
      update: { state, checkedIn: false, proxy: false },
    })

    if (state === "BOOKED") {
      const card = await pickConsumableCard(tx, studentId)
      let cardId: string | null = null
      if (card) {
        if (!card.isUnlimited) {
          await tx.studentCard.update({ where: { id: card.id }, data: { balance: { decrement: 1 } } })
        }
        cardId = card.id
      } else {
        // No live StudentCard to draw from — still allow the booking if the
        // student's overall computed balance (剩余课时, the same number
        // shown everywhere in the app) is positive. This is the normal case
        // for legacy-migrated students: their whole card history lives only
        // in ledger_entries (cardId null), since the migration never
        // created StudentCard rows for them. Consume the same way, via a
        // cardless CONSUME entry — cancelling later refunds it identically
        // (see cancelOccurrenceForStudent, which already treats cardId-null
        // entries as "nothing to refund on the card side").
        const [cards, ledgerEntries] = await Promise.all([
          tx.studentCard.findMany({ where: { studentId } }),
          tx.ledgerEntry.findMany({ where: { studentId } }),
        ])
        if (computeRemainingBalance(cards, ledgerEntries) <= 0) throw new Error("NO_VALID_CARD")
      }
      const label = styleLabel(styleDbToKey(session.style))
      await tx.ledgerEntry.upsert({
        where: { bookingId: booking.id },
        create: {
          studentId,
          cardId,
          bookingId: booking.id,
          kind: "CONSUME",
          titleZh: `${label.zh} · ${session.teacher.name}`,
          titleEn: `${label.en} · ${session.teacher.nameEn}`,
          date: new Date(),
          delta: -1,
        },
        update: {},
      })
    }

    return booking
  })
}

// `date` is the specific calendar occurrence being booked (ISO
// "YYYY-MM-DD") — a student books one date's instance of a recurring
// session at a time, not the whole weekly series.
export async function bookClass(sessionId: string, date: string) {
  const { studentId } = await requireRole("STUDENT")
  if (!studentId) throw new Error("NO_LINKED_STUDENT")
  return bookOccurrenceForStudent(sessionId, date, studentId)
}

// Admin-side 课时登记 — staff registering a specific student into a specific
// class occurrence on their behalf. Always lands as BOOKED (forceBooked),
// bypassing the capacity/waitlist check self-booking uses: waitlisting
// exists to queue students fairly under uncontrolled self-service demand,
// not to silently no-op an admin's explicit "register this student" action
// — and the legacy-migrated dataset routinely already exceeds a session's
// nominal capacity, so without this an admin could almost never actually
// register (and therefore charge) anyone through this feature. Guards
// against double-registering someone already on the roster, since the
// shared core's upsert would otherwise silently consume a second credit
// without creating a second ledger entry to show for it.
export async function adminBookStudent(sessionId: string, date: string, studentId: string) {
  await requireRole("ADMIN")
  const occurrenceDate = parseISODate(date)
  const existing = await prisma.booking.findUnique({
    where: { studentId_sessionId_date: { studentId, sessionId, date: occurrenceDate } },
  })
  if (existing && existing.state !== "CANCELED") throw new Error("ALREADY_REGISTERED")
  return bookOccurrenceForStudent(sessionId, date, studentId, { forceBooked: true })
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
async function cancelOccurrenceForStudent(sessionId: string, date: string, studentId: string) {
  const occurrenceDate = parseISODate(date)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM class_sessions WHERE id = ${sessionId} FOR UPDATE`

    const booking = await tx.booking.findUnique({
      where: { studentId_sessionId_date: { studentId, sessionId, date: occurrenceDate } },
    })
    if (!booking || booking.state === "CANCELED") return booking

    if (booking.state === "BOOKED") {
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

    return tx.booking.update({ where: { id: booking.id }, data: { state: "CANCELED" } })
  })
}

export async function cancelBooking(sessionId: string, date: string) {
  const { studentId } = await requireRole("STUDENT")
  if (!studentId) throw new Error("NO_LINKED_STUDENT")
  return cancelOccurrenceForStudent(sessionId, date, studentId)
}

// Admin-side removal from the 课时登记 roster — takes the bookingId shown in
// the roster list directly, rather than round-tripping (sessionId, date,
// studentId), since that's exactly what the admin UI already has on hand.
export async function adminCancelBooking(bookingId: string) {
  await requireRole("ADMIN")
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })
  return cancelOccurrenceForStudent(booking.sessionId, toISODate(booking.date), booking.studentId)
}
