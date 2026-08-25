"use server"

import { prisma } from "@/lib/db"
import { requireAnyRole } from "@/lib/auth"
import { parseISODate } from "@/lib/schedule-dates"
import { computeRemainingBalance, formatLedgerDate } from "@/lib/mappers"
import type { RosterEntry } from "@/lib/types"

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
    include: { student: { select: { name: true, cards: true, ledgerEntries: true } } },
    orderBy: { createdAt: "asc" },
  })
  return bookings.map((b) => ({
    id: b.id,
    name: b.student.name,
    checkedIn: b.checkedIn,
    proxy: b.proxy,
    remainingSessions: computeRemainingBalance(b.student.cards, b.student.ledgerEntries),
    createdAt: formatLedgerDate(b.createdAt),
  }))
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
