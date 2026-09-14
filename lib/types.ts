// View-model types shared between the Prisma-backed data layer (lib/data.ts,
// lib/mappers.ts) and the UI. Components render exactly these shapes
// regardless of whether the value came from a DB row or (previously) a
// static mock array — keeping the shapes stable is what let the DB wiring
// swap data sources without rewriting the JSX.

export type CategoryKey =
  | "category.bullet"
  | "category.blitz"
  | "category.rapid"
  | "category.classical"
  | "category.openings"
  | "category.endgame"

export const categoryColors: Record<CategoryKey, string> = {
  "category.bullet": "var(--chart-1)",
  "category.blitz": "var(--chart-2)",
  "category.rapid": "var(--chart-3)",
  "category.classical": "var(--chart-4)",
  "category.openings": "var(--chart-5)",
  "category.endgame": "var(--accent)",
}

export type Teacher = {
  id: string
  name: string
  nameEn: string
  avatar: string
  categories: CategoryKey[]
  rating: number | null
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
  category: CategoryKey
  kind: "regular" | "tournament"
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
  category: CategoryKey
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
  category: CategoryKey
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
  // Populated for the student's own profile only (getStudentAppData) — the
  // bearer credential encoded into their check-in QR code. Never included
  // in the admin students list, which is a bulk payload of every student
  // at once and would otherwise leak every code in one response.
  checkInCode?: string
  // Populated for the student's own profile and the admin students view —
  // a free-text note the student writes about themself (e.g. injuries).
  // Visible to the student, their teachers (via RosterEntry.note), and
  // admin — but never in a bulk list another student could see.
  note?: string | null
  // A chess.com/lichess-style rating — null for a student without one yet.
  rating: number | null
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
  note: string | null
}

// One 接龙/取消接龙 event for one class occurrence — admin-only 课时登记
// history log, distinct from RosterEntry (current roster only, no
// cancels). See prisma/schema.prisma's BookingEvent for why this needs its
// own table rather than reading Booking.createdAt/state directly.
export type BookingEventEntry = {
  id: string
  studentName: string
  type: "ADD" | "CANCEL"
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

// One coach comment on a GameReview, pinned to a specific half-move (ply,
// 0-indexed) — see prisma/schema.prisma's GameComment for why `text` is a
// single free-text field, not a zh/en pair.
export type GameComment = {
  id: string
  ply: number
  teacherName: string
  text: string
  createdAt: string // display datetime, e.g. "2026-09-14 14:20"
}

// A student-submitted PGN for a coach to review ("课后复盘"). `teacherId`
// null means no coach has picked it up yet (see lib/actions/game-reviews.ts).
export type GameReview = {
  id: string
  studentId: string
  studentName?: string // populated for the teacher's cross-student list only
  teacherId: string | null
  teacherName?: string
  title: string
  pgn: string
  result: string | null
  createdAt: string // display date, e.g. "2026-09-10"
  comments: GameComment[]
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
