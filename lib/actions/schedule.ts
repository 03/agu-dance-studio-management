"use server"

import { prisma } from "@/lib/db"
import { buildOccurrences } from "@/lib/data"
import { monthRange } from "@/lib/schedule-dates"

// Occurrence data (booked counts) for one calendar month — same public
// visibility as getPublicScheduleData (no login required), fetched
// on-demand as the homepage's month view is navigated so we don't have to
// eagerly ship every month a visitor might ever click to.
export async function getOccurrencesForMonth(year: number, month: number) {
  const { start, end } = monthRange(year, month)
  const bookings = await prisma.booking.findMany({
    where: {
      session: { status: "NORMAL" },
      date: { gte: start, lt: end },
      state: { in: ["BOOKED", "WAITLIST"] },
    },
    select: { sessionId: true, date: true, state: true, studentId: true },
  })
  return buildOccurrences(bookings)
}
