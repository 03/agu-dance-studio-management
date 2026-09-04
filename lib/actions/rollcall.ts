"use server"

import { prisma } from "@/lib/db"
import { requireAnyRole, requireRole } from "@/lib/auth"
import { parseISODate } from "@/lib/schedule-dates"
import { computeRemainingBalance, formatLedgerDate } from "@/lib/mappers"
import { decodeCheckInPayload } from "@/lib/checkin"
import type { RosterEntry, BookingEventEntry } from "@/lib/types"

async function assertOwnsSession(sessionId: string) {
  const session = await requireAnyRole(["TEACHER", "ADMIN"])
  if (session.role === "ADMIN") return
  const cls = await prisma.classSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: { teacherId: true },
  })
  if (cls.teacherId !== session.teacherId) throw new Error("FORBIDDEN")
}

// `RosterEntry.id` is the Booking id (roll-call check-in writes target a
// specific booking, not a student — a student could in principle have more
// than one booking across different sessions). `date` scopes the roster to
// the one occurrence being taught right now, not every date this recurring
// slot has ever run.
export async function getRosterForSession(sessionId: string, date: string): Promise<RosterEntry[]> {
  await assertOwnsSession(sessionId)
  const bookings = await prisma.booking.findMany({
    where: { sessionId, date: parseISODate(date), state: { in: ["BOOKED", "WAITLIST"] } },
    include: { student: { select: { name: true, cards: true, ledgerEntries: true, note: true } } },
    orderBy: { createdAt: "asc" },
  })
  return bookings.map((b) => ({
    id: b.id,
    name: b.student.name,
    checkedIn: b.checkedIn,
    proxy: b.proxy,
    remainingSessions: computeRemainingBalance(b.student.cards, b.student.ledgerEntries),
    createdAt: formatLedgerDate(b.createdAt),
    note: b.student.note,
  }))
}

// 接龙历史 — add/cancel log for one class occurrence, newest first, shown
// below 已登记学员 in 课时登记's roster dialog. Admin-only: unlike the
// roster above (which teachers also see for their own roll-call), this is
// specifically an admin audit view (see lib/actions/bookings.ts's
// BookingEvent writes for what feeds it).
export async function getBookingHistoryForSession(sessionId: string, date: string): Promise<BookingEventEntry[]> {
  await requireRole("ADMIN")
  const events = await prisma.bookingEvent.findMany({
    where: { sessionId, date: parseISODate(date) },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return events.map((e) => ({
    id: e.id,
    studentName: e.student.name,
    type: e.type,
    createdAt: formatLedgerDate(e.createdAt),
  }))
}

// Scan-to-check-in: resolves the QR payload to a student via their
// checkInCode, then checks in that student's *existing* booking for this
// exact occurrence — this only ever flips an already-registered student's
// checkedIn flag, the same thing the manual tap-to-check-in button does,
// just found by scan instead of by tapping their name in the roster. It
// deliberately does not create a new booking for an unregistered student:
// that path has its own capacity/waitlist/card-balance rules (see
// lib/actions/bookings.ts) that a quick scan shouldn't silently bypass —
// register them properly first, then scan.
export async function checkInByCode(
  sessionId: string,
  date: string,
  payload: string,
): Promise<{ bookingId: string; name: string }> {
  await assertOwnsSession(sessionId)
  const code = decodeCheckInPayload(payload)
  if (!code) throw new Error("INVALID_CODE")

  const student = await prisma.student.findUnique({ where: { checkInCode: code }, select: { id: true, name: true } })
  if (!student) throw new Error("INVALID_CODE")

  // A student can hold more than one active booking for this occurrence now
  // (see lib/actions/bookings.ts's `allowDuplicate` — bringing a friend
  // along under their own account). Prefer whichever of theirs isn't
  // checked in yet, oldest first, so scanning the same QR code twice checks
  // in a second duplicate booking instead of just re-confirming the first.
  const booking = await prisma.booking.findFirst({
    where: { studentId: student.id, sessionId, date: parseISODate(date), state: { not: "CANCELED" } },
    orderBy: [{ checkedIn: "asc" }, { createdAt: "asc" }],
  })
  if (!booking) throw new Error("NOT_REGISTERED")

  // Idempotent on purpose — a re-scan of an already-checked-in student (a
  // teacher scanning twice by accident, say) just reports success again
  // rather than erroring.
  await prisma.booking.update({ where: { id: booking.id }, data: { checkedIn: true, proxy: false } })
  return { bookingId: booking.id, name: student.name }
}

// "全部签到" — mark every not-yet-checked-in BOOKED student for this occurrence
// as present in one go. Deliberately:
//   - BOOKED only — waitlisted students aren't confirmed in the class
//   - checkedIn:false only — leaves already-checked-in rows (incl. QR scans and
//     代签) exactly as they are
//   - proxy:false — counts as a normal check-in, per the roster's own semantics
// Returns the fresh roster so the caller doesn't have to guess what changed.
export async function checkInAll(sessionId: string, date: string): Promise<RosterEntry[]> {
  await assertOwnsSession(sessionId)
  await prisma.booking.updateMany({
    where: { sessionId, date: parseISODate(date), state: "BOOKED", checkedIn: false },
    data: { checkedIn: true, proxy: false },
  })
  return getRosterForSession(sessionId, date)
}

export async function setCheckedIn(bookingId: string, checkedIn: boolean, proxy = false) {
  const session = await requireAnyRole(["TEACHER", "ADMIN"])
  if (session.role !== "ADMIN") {
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { session: { select: { teacherId: true } } },
    })
    if (booking.session.teacherId !== session.teacherId) throw new Error("FORBIDDEN")
  }
  await prisma.booking.update({
    where: { id: bookingId },
    data: { checkedIn, proxy: checkedIn ? proxy : false },
  })
}
