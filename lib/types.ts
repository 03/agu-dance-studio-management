// View-model types shared between the Prisma-backed data layer (lib/data.ts,
// lib/mappers.ts) and the UI. Components render exactly these shapes
// regardless of whether the value came from a DB row or (previously) a
// static mock array — keeping the shapes stable is what let the DB wiring
// swap data sources without rewriting the JSX.

export type StyleKey =
  | "style.jazz"
  | "style.hiphop"
  | "style.ballet"
  | "style.kpop"
  | "style.contemporary"
  | "style.latin"
  | "style.jazzKpop"

export const styleColors: Record<StyleKey, string> = {
  "style.jazz": "var(--chart-1)",
  "style.hiphop": "var(--chart-4)",
  "style.ballet": "var(--chart-3)",
  "style.kpop": "var(--chart-2)",
  "style.contemporary": "var(--chart-5)",
  "style.latin": "var(--accent)",
  "style.jazzKpop": "var(--chart-6)",
}

export type Teacher = {
  id: string
  name: string
  nameEn: string
  avatar: string
  styles: StyleKey[]
}

export type Room = {
  id: string
  name: string
  nameEn: string
  address: string | null
}

// Admin-only view of a Room, with the extra business fields
// (code/address/postalCode/notes) that student/teacher/public payloads
// never need to receive.
export type Studio = {
  id: string
  code: string | null
  name: string
  nameEn: string
  address: string | null
  postalCode: string | null
  notes: string | null
}

// A recurring weekly slot — a template, not tied to any specific calendar
// date. How many people are booked, and whether "I" am booked, only make
// sense for one specific occurrence of this slot (see Occurrence below).
export type ClassSession = {
  id: string
  style: StyleKey
  teacherId: string
  roomId: string
  day: number // 0 = Mon ... 6 = Sun
  start: string
  end: string
  capacity: number
  level: { zh: string; en: string }
  status?: "normal" | "canceled"
  // ISO "YYYY-MM-DD", or null for "no bound" (the default — runs
  // indefinitely, same as before these existed). See isSessionActiveOn
  // (lib/schedule-dates.ts) for how these combine with ClassClosure.
  startDate: string | null
  endDate: string | null
}

// A date range this session (or, when sessionId is null, every session)
// doesn't run — see prisma/schema.prisma's ClassClosure for the distinction
// from ClassSession.startDate/endDate.
export type ClassClosure = {
  id: string
  startDate: string
  endDate: string
  note: string | null
  sessionId: string | null
}

// One specific calendar occurrence of a ClassSession — how many are booked
// and (for a logged-in student) their own booking state, both scoped to
// that exact date. Keyed by `${sessionId}__${date}` (lib/schedule-dates.ts
// occurrenceKey) so a flat array from the server becomes an O(1) lookup map
// on the client.
export type Occurrence = {
  sessionId: string
  date: string // ISO "YYYY-MM-DD"
  booked: number
  myState: "none" | "booked" | "waitlist"
}

// A student's own booking, materialized with the session's display fields
// and the real occurrence date — used for the "upcoming classes" list.
export type UpcomingBooking = {
  bookingId: string
  sessionId: string
  style: StyleKey
  teacherId: string
  roomId: string
  day: number
  date: string // ISO "YYYY-MM-DD"
  start: string
  end: string
  myState: "booked" | "waitlist"
}

// Same shape, but for a class occurrence that has already happened — used
// for the "history" list, which cares whether the student checked in rather
// than whether they're still booked/waitlisted.
export type PastBooking = {
  bookingId: string
  sessionId: string
  style: StyleKey
  teacherId: string
  roomId: string
  day: number
  date: string // ISO "YYYY-MM-DD"
  start: string
  end: string
  checkedIn: boolean
}

export type CardType = "stu.card.times" | "stu.card.period" | "stu.card.trial"

export type PaymentMethod = "payment.transfer" | "payment.cash"

export type StudentCard = {
  id: string
  type: CardType
  name: { zh: string; en: string }
  balance: number | "unlimited"
  total: number | null
  expiry: string
  daysLeft: number
}

export type LedgerEntry = {
  id: string
  kind: "ledger.consume" | "ledger.recharge" | "ledger.gift" | "ledger.refund" | "ledger.adjust"
  title: { zh: string; en: string }
  date: string
  delta: number // classes; negative = consumed
  note?: { zh: string; en: string }
}

export type Student = {
  id: string
  name: string
  phone: string | null
  wechat: string | null
  email: string | null
  code: string | null
  cards: number
  totalBalance: number
  joined: string
  status: "active" | "expiring" | "inactive"
  // Populated for the admin students view only — the full card list a
  // gift/adjust/refund action can target. Absent elsewhere.
  cardDetails?: StudentCard[]
  // Populated for the admin students view only — count of consumed
  // class-hours and the detail list behind the "已用课时" link, newest first.
  usedSessions?: number
  usageHistory?: LedgerEntry[]
}

export type CardProduct = {
  id: string
  type: CardType
  name: { zh: string; en: string }
  price: number
  sessions: number | "unlimited"
  validityDays: number
}

// A real Payment row, for the admin cashier feed.
export type CashierEntry = {
  id: string
  studentName: string
  cardName: { zh: string; en: string } | null
  amount: number
  method: PaymentMethod
  paidAt: string // display date, e.g. "12.08 14:20"
}

// Roster for teacher roll-call view / admin attendance registration
export type RosterEntry = {
  id: string
  name: string
  checkedIn: boolean
  proxy?: boolean
  remainingSessions: number
  createdAt: string
}

export const weekdayKeys = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"]

export type AppUserRole = "student" | "teacher" | "admin"

export type AppUser = {
  id: string
  username: string
  role: AppUserRole
  linkedName: string | null // linked student/teacher's display name, null for admin accounts
  mustChangePassword: boolean
  createdAt: string // display date, e.g. "2026-08-14"
}

// One row of the 备份/还原 audit log (lib/backup.ts, app/api/admin/{backup,restore}).
export type BackupRecordEntry = {
  id: string
  action: "backup" | "restore"
  filename: string
  status: "success" | "failed"
  message: string | null
  createdBy: string
  createdAt: string // display datetime, e.g. "2026-08-18 14:20"
}
