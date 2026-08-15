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

export const styleColors: Record<StyleKey, string> = {
  "style.jazz": "var(--chart-1)",
  "style.hiphop": "var(--chart-4)",
  "style.ballet": "var(--chart-3)",
  "style.kpop": "var(--chart-2)",
  "style.contemporary": "var(--chart-5)",
  "style.latin": "var(--accent)",
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
}

export type ClassSession = {
  id: string
  style: StyleKey
  teacherId: string
  roomId: string
  day: number // 0 = Mon ... 6 = Sun
  date: string // display date label
  start: string
  end: string
  capacity: number
  booked: number
  level: { zh: string; en: string }
  status?: "normal" | "canceled"
  myState?: "none" | "booked" | "waitlist"
}

export type CardType = "stu.card.times" | "stu.card.period" | "stu.card.trial"

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
  phone: string
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
}

export type CardProduct = {
  id: string
  type: CardType
  name: { zh: string; en: string }
  price: number
  sessions: number | "unlimited"
  validityDays: number
}

// Roster for teacher roll-call view
export type RosterEntry = { id: string; name: string; checkedIn: boolean; proxy?: boolean }

export type NotificationRule = {
  id: string
  key: string
  channel: { zh: string; en: string }
  enabled: boolean
  sample: { zh: string; en: string }
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
