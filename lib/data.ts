import { prisma } from "@/lib/db"
import {
  mapTeacher,
  mapRoom,
  mapClassSession,
  mapStudent,
  mapStudentCard,
  mapLedgerEntry,
  mapCardProduct,
  mapNotificationRule,
  mapUser,
  styleDbToKey,
} from "@/lib/mappers"
import type { ClassSession, StyleKey } from "@/lib/types"

const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function lastNMonthRanges(n: number, now = new Date()) {
  const ranges: { start: Date; end: Date; month: string; en: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    ranges.push({ start, end, month: `${start.getMonth() + 1}月`, en: MONTH_EN[start.getMonth()] })
  }
  return ranges
}

function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// Everything the student app needs for one specific logged-in student —
// deliberately excludes admin financials, the full student roster, card
// products and notification rules, none of which student/*.tsx reads.
export async function getStudentAppData(studentId: string) {
  const [teachers, rooms, sessionsRaw, studentRow, ledgerRaw, bookingsForRate] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { id: "asc" } }),
    prisma.room.findMany({ orderBy: { id: "asc" } }),
    prisma.classSession.findMany({
      orderBy: [{ day: "asc" }, { start: "asc" }],
      include: { bookings: { select: { state: true, studentId: true } } },
    }),
    prisma.student.findMany({ where: { id: studentId }, include: { cards: true } }),
    prisma.ledgerEntry.findMany({ where: { studentId }, orderBy: { date: "desc" } }),
    prisma.booking.findMany({ where: { studentId }, select: { checkedIn: true } }),
  ])

  const sessions = sessionsRaw.map((s) => mapClassSession(s, studentId))
  const meRow = studentRow[0]
  const attendanceRate =
    bookingsForRate.length > 0
      ? Math.round((bookingsForRate.filter((b) => b.checkedIn).length / bookingsForRate.length) * 100)
      : 0

  return {
    teachers: teachers.map(mapTeacher),
    rooms: rooms.map(mapRoom),
    sessions,
    student: {
      me: meRow ? mapStudent(meRow, { includeCardDetails: true }) : null,
      cards: meRow ? meRow.cards.map(mapStudentCard) : [],
      ledger: ledgerRaw.map(mapLedgerEntry),
      upcoming: sessions.filter((s: ClassSession) => s.myState === "booked" || s.myState === "waitlist"),
      attendanceRate,
    },
  }
}

// Everything the teacher app needs for one specific logged-in teacher.
export async function getTeacherAppData(teacherId: string) {
  const [teacherRow, rooms, sessionsRaw] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId } }),
    prisma.room.findMany({ orderBy: { id: "asc" } }),
    prisma.classSession.findMany({
      where: { teacherId },
      orderBy: [{ day: "asc" }, { start: "asc" }],
      include: { bookings: { select: { state: true, studentId: true } } },
    }),
  ])

  return {
    rooms: rooms.map(mapRoom),
    teacher: {
      me: teacherRow ? mapTeacher(teacherRow) : null,
      sessions: sessionsRaw.map((s) => mapClassSession(s)),
    },
  }
}

// Everything the admin app needs — the only role that legitimately sees
// every student's PII, all payments/financials, and the account list.
export async function getAdminAppData() {
  const [teachers, rooms, sessionsRaw, cardProducts, notificationRules, studentsRaw, teacherStatsRaw, usersRaw] =
    await Promise.all([
      prisma.teacher.findMany({ orderBy: { id: "asc" } }),
      prisma.room.findMany({ orderBy: { id: "asc" } }),
      prisma.classSession.findMany({
        orderBy: [{ day: "asc" }, { start: "asc" }],
        include: { bookings: { select: { state: true, studentId: true } } },
      }),
      prisma.cardProduct.findMany({ orderBy: { id: "asc" } }),
      prisma.notificationRule.findMany({ orderBy: { id: "asc" } }),
      prisma.student.findMany({ include: { cards: true }, orderBy: { id: "asc" } }),
      prisma.teacherStat.findMany(),
      prisma.user.findMany({
        include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ])

  const admin = await getAdminAnalytics(teacherStatsRaw)

  return {
    teachers: teachers.map(mapTeacher),
    rooms: rooms.map(mapRoom),
    sessions: sessionsRaw.map((s) => mapClassSession(s)),
    cardProducts: cardProducts.map(mapCardProduct),
    notificationRules: notificationRules.map(mapNotificationRule),
    students: studentsRaw.map((s) => mapStudent(s, { includeCardDetails: true })),
    users: usersRaw.map(mapUser),
    admin,
  }
}

async function getAdminAnalytics(teacherStatsRaw: { teacherId: string; heads: number; commission: number }[]) {
  const monthRanges = lastNMonthRanges(6)
  const rangeStart = monthRanges[0].start

  const [payments, consumeEntries, checkedInCount, activeStudents, monthConsumed] = await Promise.all([
    prisma.payment.findMany({ where: { paidAt: { gte: rangeStart } }, select: { amount: true, paidAt: true } }),
    prisma.ledgerEntry.findMany({
      where: { kind: "CONSUME" },
      select: { delta: true, booking: { select: { session: { select: { style: true } } } } },
    }),
    prisma.booking.count({ where: { checkedIn: true } }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.ledgerEntry.aggregate({
      where: { kind: "CONSUME", date: { gte: startOfMonth() } },
      _sum: { delta: true },
    }),
  ])

  const cashFlow = monthRanges.map(({ start, end, month, en }) => ({
    month,
    en,
    value: payments
      .filter((p) => p.paidAt >= start && p.paidAt < end)
      .reduce((sum, p) => sum + p.amount, 0),
  }))

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

  const thisMonthPayments = payments.filter((p) => p.paidAt >= startOfMonth())
  const kpis = {
    revenue: thisMonthPayments.reduce((sum, p) => sum + p.amount, 0),
    consumed: Math.abs(monthConsumed._sum.delta ?? 0),
    headcount: checkedInCount,
    activeStudents,
  }

  const teacherStats = teacherStatsRaw.map((t) => ({ teacherId: t.teacherId, heads: t.heads, commission: t.commission }))

  return { kpis, cashFlow, consumptionByStyle, teacherStats }
}

export type StudentAppData = Awaited<ReturnType<typeof getStudentAppData>>
export type TeacherAppData = Awaited<ReturnType<typeof getTeacherAppData>>
export type AdminAppData = Awaited<ReturnType<typeof getAdminAppData>>
