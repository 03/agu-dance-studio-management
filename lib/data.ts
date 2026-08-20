import { prisma } from "@/lib/db"
import {
  mapTeacher,
  mapRoom,
  mapStudio,
  mapClassSession,
  mapStudent,
  mapStudentCard,
  mapLedgerEntryDateOnly,
  mapCardProduct,
  mapCashierEntry,
  mapUser,
  mapBackupRecord,
  mapUpcomingBooking,
  mapPastBooking,
  styleDbToKey,
  bookingStateToMyState,
} from "@/lib/mappers"
import { toISODate, occurrenceKey } from "@/lib/schedule-dates"
import type { StyleKey, Occurrence, UpcomingBooking } from "@/lib/types"
import type { BookingState } from "@/lib/generated/prisma/client"

const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Turns a flat list of Bookings (already filtered to BOOKED/WAITLIST — never
// pass CANCELED rows in) into one Occurrence per (session, date) pair.
// `forStudentId`, when given, also fills in that student's own myState for
// each occurrence they appear in.
export function buildOccurrences(
  bookings: { sessionId: string; date: Date; state: BookingState; studentId: string }[],
  forStudentId?: string,
): Occurrence[] {
  const map = new Map<string, Occurrence>()
  for (const b of bookings) {
    const date = toISODate(b.date)
    const key = occurrenceKey(b.sessionId, date)
    let entry = map.get(key)
    if (!entry) {
      entry = { sessionId: b.sessionId, date, booked: 0, myState: "none" }
      map.set(key, entry)
    }
    if (b.state === "BOOKED") entry.booked += 1
    if (forStudentId && b.studentId === forStudentId) entry.myState = bookingStateToMyState(b.state)
  }
  return Array.from(map.values())
}

function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// Public, pre-login landing page data — just the recurring weekly class
// template (style/time/teacher/room), safe to show to anyone. No student
// PII. `occurrences` covers this calendar month plus the next 7 days (so
// week view's "next occurrence" of each slot is always in range even when
// it falls just past month-end); MonthView fetches further months on
// demand via getOccurrencesForMonth (lib/actions/schedule.ts) rather than
// this eagerly covering every month the visitor might navigate to.
export async function getPublicScheduleData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd

  const [sessionsRaw, roomsRaw, bookingsRaw] = await Promise.all([
    prisma.classSession.findMany({
      where: { status: "NORMAL" },
      orderBy: [{ day: "asc" }, { start: "asc" }],
    }),
    prisma.room.findMany({ orderBy: { id: "asc" } }),
    prisma.booking.findMany({
      where: {
        session: { status: "NORMAL" },
        date: { gte: monthStart, lt: rangeEnd },
        state: { in: ["BOOKED", "WAITLIST"] },
      },
      select: { sessionId: true, date: true, state: true, studentId: true },
    }),
  ])

  return {
    sessions: sessionsRaw.map((s) => mapClassSession(s)),
    rooms: roomsRaw.map(mapRoom),
    occurrences: buildOccurrences(bookingsRaw),
  }
}

// Everything the student app needs for one specific logged-in student —
// deliberately excludes admin financials, the full student roster, card
// products and notification rules, none of which student/*.tsx reads.
// `occurrences` covers exactly the 16-day window the day-picker in
// student-schedule.tsx offers (2 days back through 2 weeks forward) — that
// picker has no further navigation, so unlike the public month view there's
// no on-demand fetch needed here.
export async function getStudentAppData(studentId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowStart = new Date(today)
  windowStart.setDate(today.getDate() - 2)
  const windowEnd = new Date(today)
  windowEnd.setDate(today.getDate() + 14)

  const [
    teachers,
    rooms,
    sessionsRaw,
    studentRow,
    ledgerRaw,
    bookingsForRate,
    occurrenceBookings,
    upcomingRaw,
    historyRaw,
  ] = await Promise.all([
      prisma.teacher.findMany({ orderBy: { id: "asc" } }),
      prisma.room.findMany({ orderBy: { id: "asc" } }),
      prisma.classSession.findMany({ orderBy: [{ day: "asc" }, { start: "asc" }] }),
      prisma.student.findMany({ where: { id: studentId }, include: { cards: true } }),
      prisma.ledgerEntry.findMany({ where: { studentId }, orderBy: { date: "desc" } }),
      prisma.booking.findMany({ where: { studentId }, select: { checkedIn: true } }),
      prisma.booking.findMany({
        where: { date: { gte: windowStart, lt: windowEnd }, state: { in: ["BOOKED", "WAITLIST"] } },
        select: { sessionId: true, date: true, state: true, studentId: true },
      }),
      prisma.booking.findMany({
        where: { studentId, date: { gte: today }, state: { in: ["BOOKED", "WAITLIST"] } },
        include: { session: true },
        orderBy: { date: "asc" },
      }),
      prisma.booking.findMany({
        where: { studentId, date: { lt: today }, state: "BOOKED" },
        include: { session: true },
        orderBy: { date: "desc" },
        take: 50,
      }),
    ])

  const meRow = studentRow[0]
  const attendanceRate =
    bookingsForRate.length > 0
      ? Math.round((bookingsForRate.filter((b) => b.checkedIn).length / bookingsForRate.length) * 100)
      : 0

  return {
    teachers: teachers.map(mapTeacher),
    rooms: rooms.map(mapRoom),
    sessions: sessionsRaw.map((s) => mapClassSession(s)),
    occurrences: buildOccurrences(occurrenceBookings, studentId),
    student: {
      // ledgerRaw folded in so legacy-migrated students (no StudentCard rows,
      // whole card history lives only in ledger_entries) get a correct
      // totalBalance instead of always showing 0 — see mapStudent's
      // cardlessNet handling.
      me: meRow ? mapStudent({ ...meRow, ledgerEntries: ledgerRaw }, { includeCardDetails: true }) : null,
      cards: meRow ? meRow.cards.map(mapStudentCard) : [],
      ledger: ledgerRaw.map(mapLedgerEntryDateOnly),
      upcoming: upcomingRaw.map(mapUpcomingBooking),
      history: historyRaw.map(mapPastBooking),
      attendanceRate,
    },
  }
}

// Everything the teacher app needs for one specific logged-in teacher.
// `occurrences` covers the next 7 days — teacher-schedule.tsx shows each
// session's next real-date occurrence (via nextOccurrence()), so that's the
// only window whose booked counts it can ever display.
export async function getTeacherAppData(teacherId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  const [teacherRow, rooms, sessionsRaw, occurrenceBookings] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId } }),
    prisma.room.findMany({ orderBy: { id: "asc" } }),
    prisma.classSession.findMany({
      where: { teacherId },
      orderBy: [{ day: "asc" }, { start: "asc" }],
    }),
    prisma.booking.findMany({
      where: { session: { teacherId }, date: { gte: today, lt: weekEnd }, state: { in: ["BOOKED", "WAITLIST"] } },
      select: { sessionId: true, date: true, state: true, studentId: true },
    }),
  ])

  return {
    rooms: rooms.map(mapRoom),
    occurrences: buildOccurrences(occurrenceBookings),
    teacher: {
      me: teacherRow ? mapTeacher(teacherRow) : null,
      sessions: sessionsRaw.map((s) => mapClassSession(s)),
    },
  }
}

// Everything the admin app needs — the only role that legitimately sees
// every student's PII, all payments/financials, and the account list.
export async function getAdminAppData() {
  const [
    teachers,
    rooms,
    sessionsRaw,
    cardProducts,
    studentsRaw,
    usersRaw,
    cashierRaw,
    backupRecordsRaw,
  ] = await Promise.all([
      prisma.teacher.findMany({ orderBy: { id: "asc" } }),
      prisma.room.findMany({ orderBy: { id: "asc" } }),
      prisma.classSession.findMany({ orderBy: [{ day: "asc" }, { start: "asc" }] }),
      prisma.cardProduct.findMany({ orderBy: { id: "asc" } }),
      prisma.student.findMany({
        include: {
          cards: true,
          // All kinds, not just CONSUME: mapStudent needs RECHARGE/GIFT/ADJUST
          // too to compute correct totals for legacy-migrated students, whose
          // whole card history lives only in ledger_entries (no StudentCard
          // rows were created for them — see the legacy migration).
          ledgerEntries: { orderBy: { date: "desc" } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.user.findMany({
        include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.findMany({
        include: { student: { select: { name: true } }, card: { select: { nameZh: true, nameEn: true } } },
        orderBy: { paidAt: "desc" },
        take: 20,
      }),
      prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    ])

  const [admin, sessionStats, cashFlow] = await Promise.all([
    getAdminAnalytics(),
    getYearlyStyleStats(new Date().getFullYear()),
    getYearlyCashFlow(new Date().getFullYear()),
  ])

  return {
    teachers: teachers.map(mapTeacher),
    rooms: rooms.map(mapRoom),
    studios: rooms.map(mapStudio),
    sessions: sessionsRaw.map((s) => mapClassSession(s)),
    cardProducts: cardProducts.map(mapCardProduct),
    students: studentsRaw.map((s) => mapStudent(s, { includeCardDetails: true, includeUsageHistory: true })),
    users: usersRaw.map(mapUser),
    cashier: cashierRaw.map(mapCashierEntry),
    backupRecords: backupRecordsRaw.map(mapBackupRecord),
    admin,
    sessionStats,
    cashFlow,
  }
}

// Monthly, per-style breakdown of consumed class-hours for one calendar
// year — backs both the admin overview's default (current year) and the
// on-demand year navigation in lib/actions/analytics.ts. Entries without a
// linked booking (older synthetic seed data) are skipped, same as
// getAdminAnalytics()'s consumptionByStyle above.
export async function getYearlyStyleStats(year: number) {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const [entries, earliest] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { kind: "CONSUME", date: { gte: start, lt: end } },
      select: { delta: true, date: true, booking: { select: { session: { select: { style: true } } } } },
    }),
    prisma.ledgerEntry.aggregate({ where: { kind: "CONSUME" }, _min: { date: true } }),
  ])

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: `${i + 1}月`,
    en: MONTH_EN[i],
    total: 0,
    byStyle: {} as Partial<Record<StyleKey, number>>,
  }))
  for (const e of entries) {
    const style = e.booking?.session?.style
    if (!style) continue
    const key = styleDbToKey(style)
    const amt = Math.abs(e.delta)
    const m = months[e.date.getMonth()]
    m.total += amt
    m.byStyle[key] = (m.byStyle[key] ?? 0) + amt
  }

  const minYear = earliest._min.date ? earliest._min.date.getFullYear() : year
  const maxYear = new Date().getFullYear()
  return { year, months, minYear, maxYear }
}

export type YearlyStyleStats = Awaited<ReturnType<typeof getYearlyStyleStats>>

// Full-year, per-month cash flow (sum of real Payment.amount rows) — backs
// the admin finance page's cash flow chart with the same on-demand
// year-navigation pattern as getYearlyStyleStats/getSessionStatsForYear.
export async function getYearlyCashFlow(year: number) {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const [payments, earliest] = await Promise.all([
    prisma.payment.findMany({ where: { paidAt: { gte: start, lt: end } }, select: { amount: true, paidAt: true } }),
    prisma.payment.aggregate({ _min: { paidAt: true } }),
  ])

  const months = Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, en: MONTH_EN[i], value: 0 }))
  for (const p of payments) {
    months[p.paidAt.getMonth()].value += p.amount
  }

  const minYear = earliest._min.paidAt ? earliest._min.paidAt.getFullYear() : year
  const maxYear = new Date().getFullYear()
  return { year, months, minYear, maxYear }
}

export type YearlyCashFlow = Awaited<ReturnType<typeof getYearlyCashFlow>>

async function getAdminAnalytics() {
  const [thisMonthPayments, consumeEntries, checkedInBookings, activeStudents, monthConsumed] = await Promise.all([
    prisma.payment.findMany({ where: { paidAt: { gte: startOfMonth() } }, select: { amount: true } }),
    prisma.ledgerEntry.findMany({
      where: { kind: "CONSUME" },
      select: { delta: true, booking: { select: { session: { select: { style: true } } } } },
    }),
    prisma.booking.findMany({ where: { checkedIn: true }, select: { session: { select: { teacherId: true } } } }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.ledgerEntry.aggregate({
      where: { kind: "CONSUME", date: { gte: startOfMonth() } },
      _sum: { delta: true },
    }),
  ])

  const consumptionMap = new Map<StyleKey, number>()
  for (const entry of consumeEntries) {
    const style = entry.booking?.session?.style
    if (!style) continue
    const key = styleDbToKey(style)
    consumptionMap.set(key, (consumptionMap.get(key) ?? 0) + Math.abs(entry.delta))
  }
  const consumptionByStyle = Array.from(consumptionMap.entries())
    .map(([style, value]) => ({ style, value }))
    .sort((a, b) => b.value - a.value)

  const kpis = {
    revenue: thisMonthPayments.reduce((sum, p) => sum + p.amount, 0),
    consumed: Math.abs(monthConsumed._sum.delta ?? 0),
    headcount: checkedInBookings.length,
    activeStudents,
  }

  const headsMap = new Map<string, number>()
  for (const b of checkedInBookings) {
    const teacherId = b.session.teacherId
    headsMap.set(teacherId, (headsMap.get(teacherId) ?? 0) + 1)
  }
  const teacherStats = Array.from(headsMap.entries())
    .map(([teacherId, heads]) => ({ teacherId, heads }))
    .sort((a, b) => b.heads - a.heads)

  return { kpis, consumptionByStyle, teacherStats }
}

export type StudentAppData = Awaited<ReturnType<typeof getStudentAppData>>
export type TeacherAppData = Awaited<ReturnType<typeof getTeacherAppData>>
export type AdminAppData = Awaited<ReturnType<typeof getAdminAppData>>
export type PublicScheduleData = Awaited<ReturnType<typeof getPublicScheduleData>>
