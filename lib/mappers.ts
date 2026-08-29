// Conversions between Prisma rows/enums and the view-model shapes in
// lib/types.ts. Keeping this in one place means the UI never has to know
// about Prisma's enum casing (e.g. "JAZZ") — it only ever sees the
// i18n-keyed strings ("style.jazz") the components were already written
// against.

import type {
  DanceStyle,
  CardType as DbCardType,
  PaymentMethod as DbPaymentMethod,
  SessionStatus,
  BookingState,
  LedgerKind as DbLedgerKind,
  StudentStatus,
  UserRole as DbUserRole,
  Teacher as DbTeacher,
  Room as DbRoom,
  ClassSession as DbClassSession,
  Booking as DbBooking,
  Student as DbStudent,
  StudentCard as DbStudentCard,
  CardProduct as DbCardProduct,
  LedgerEntry as DbLedgerEntry,
  Payment as DbPayment,
  User as DbUser,
  BackupRecord as DbBackupRecord,
  ClassClosure as DbClassClosure,
} from "@/lib/generated/prisma/client"
import type {
  StyleKey,
  Teacher,
  Room,
  Studio,
  ClassSession,
  ClassClosure,
  Occurrence,
  UpcomingBooking,
  PastBooking,
  CardType,
  StudentCard,
  LedgerEntry,
  Student,
  CardProduct,
  CashierEntry,
  PaymentMethod,
  AppUser,
  AppUserRole,
  BackupRecordEntry,
} from "@/lib/types"
import { toISODate } from "@/lib/schedule-dates"

// ---- enum <-> view-model key conversions ----

const STYLE_TO_KEY: Record<DanceStyle, StyleKey> = {
  JAZZ: "style.jazz",
  HIPHOP: "style.hiphop",
  BALLET: "style.ballet",
  KPOP: "style.kpop",
  CONTEMPORARY: "style.contemporary",
  LATIN: "style.latin",
  JAZZ_KPOP: "style.jazzKpop",
}
const KEY_TO_STYLE = Object.fromEntries(
  Object.entries(STYLE_TO_KEY).map(([db, key]) => [key, db]),
) as Record<StyleKey, DanceStyle>

export const styleKeyToDb = (key: StyleKey): DanceStyle => KEY_TO_STYLE[key]
export const styleDbToKey = (style: DanceStyle): StyleKey => STYLE_TO_KEY[style]

// Small standalone zh/en label lookup for server-side ledger-entry titling
// (lib/actions/bookings.ts). Deliberately not sourced from lib/i18n.tsx's
// `dict` — that module is "use client", and server actions shouldn't depend
// on a client-boundary module even for plain data.
const STYLE_LABEL: Record<StyleKey, { zh: string; en: string }> = {
  "style.jazz": { zh: "爵士舞", en: "Jazz" },
  "style.hiphop": { zh: "嘻哈街舞", en: "Hip-Hop" },
  "style.ballet": { zh: "芭蕾形体", en: "Ballet" },
  "style.kpop": { zh: "韩舞", en: "K-Pop" },
  "style.contemporary": { zh: "现代舞", en: "Contemporary" },
  "style.latin": { zh: "拉丁舞", en: "Latin" },
  "style.jazzKpop": { zh: "爵士舞/韩舞", en: "Jazz/Kpop" },
}
export const styleLabel = (key: StyleKey): { zh: string; en: string } => STYLE_LABEL[key]

const CARD_TYPE_TO_KEY: Record<DbCardType, CardType> = {
  TIMES: "stu.card.times",
  PERIOD: "stu.card.period",
  TRIAL: "stu.card.trial",
}
const KEY_TO_CARD_TYPE = Object.fromEntries(
  Object.entries(CARD_TYPE_TO_KEY).map(([db, key]) => [key, db]),
) as Record<CardType, DbCardType>

export const cardTypeToDb = (key: CardType): DbCardType => KEY_TO_CARD_TYPE[key]
export const cardTypeDbToKey = (type: DbCardType): CardType => CARD_TYPE_TO_KEY[type]

const PAYMENT_METHOD_TO_KEY: Record<DbPaymentMethod, PaymentMethod> = {
  TRANSFER: "payment.transfer",
  CASH: "payment.cash",
}
const KEY_TO_PAYMENT_METHOD = Object.fromEntries(
  Object.entries(PAYMENT_METHOD_TO_KEY).map(([db, key]) => [key, db]),
) as Record<PaymentMethod, DbPaymentMethod>

export const paymentMethodToDb = (key: PaymentMethod): DbPaymentMethod => KEY_TO_PAYMENT_METHOD[key]
export const paymentMethodDbToKey = (method: DbPaymentMethod): PaymentMethod => PAYMENT_METHOD_TO_KEY[method]

const LEDGER_KIND_TO_KEY: Record<DbLedgerKind, LedgerEntry["kind"]> = {
  CONSUME: "ledger.consume",
  RECHARGE: "ledger.recharge",
  GIFT: "ledger.gift",
  REFUND: "ledger.refund",
  ADJUST: "ledger.adjust",
}
export const ledgerKindDbToKey = (kind: DbLedgerKind): LedgerEntry["kind"] => LEDGER_KIND_TO_KEY[kind]

export const sessionStatusDbToKey = (status: SessionStatus): "normal" | "canceled" =>
  status === "CANCELED" ? "canceled" : "normal"
export const sessionStatusKeyToDb = (status: "normal" | "canceled"): SessionStatus =>
  status === "canceled" ? "CANCELED" : "NORMAL"

export const bookingStateToMyState = (state: BookingState | undefined): Occurrence["myState"] => {
  if (state === "BOOKED") return "booked"
  if (state === "WAITLIST") return "waitlist"
  return "none"
}

export const studentStatusDbToKey = (status: StudentStatus): Student["status"] =>
  status === "ACTIVE" ? "active" : status === "EXPIRING" ? "expiring" : "inactive"
export const studentStatusKeyToDb = (status: Student["status"]): StudentStatus =>
  status === "active" ? "ACTIVE" : status === "expiring" ? "EXPIRING" : "INACTIVE"

const USER_ROLE_TO_KEY: Record<DbUserRole, AppUserRole> = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
}
const KEY_TO_USER_ROLE = Object.fromEntries(
  Object.entries(USER_ROLE_TO_KEY).map(([db, key]) => [key, db]),
) as Record<AppUserRole, DbUserRole>

export const userRoleDbToKey = (role: DbUserRole): AppUserRole => USER_ROLE_TO_KEY[role]
export const userRoleKeyToDb = (role: AppUserRole): DbUserRole => KEY_TO_USER_ROLE[role]

// ---- date formatting (DateTime columns -> the display strings the UI expects) ----

export const formatLedgerDate = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${mm}.${dd} ${hh}:${mi}`
}

export const formatDateISO = (d: Date): string => d.toISOString().slice(0, 10)

// YYYY-MM-DD, no time — used for ledger lists that now span multiple years
// after the legacy-system data migration, where formatLedgerDate's
// year-less "MM.DD HH:mm" would be ambiguous.
const formatDateOnly = (d: Date): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export const daysLeftFrom = (expiry: Date): number =>
  Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86_400_000))

// ---- row -> view-model mappers ----

export const mapTeacher = (t: DbTeacher): Teacher => ({
  id: t.id,
  name: t.name,
  nameEn: t.nameEn,
  avatar: t.avatar,
  styles: t.styles.map(styleDbToKey),
})

export const mapRoom = (r: DbRoom): Room => ({
  id: r.id,
  name: r.name,
  nameEn: r.nameEn,
  address: r.address,
})

export const mapStudio = (r: DbRoom): Studio => ({
  id: r.id,
  code: r.code,
  name: r.name,
  nameEn: r.nameEn,
  address: r.address,
  postalCode: r.postalCode,
  notes: r.notes,
})

// Pure template mapping — no booking data. Occurrence-level fields
// (booked count, myState) are computed separately per calendar date; see
// lib/data.ts's buildOccurrences.
export function mapClassSession(s: DbClassSession): ClassSession {
  return {
    id: s.id,
    style: styleDbToKey(s.style),
    teacherId: s.teacherId,
    roomId: s.roomId,
    day: s.day,
    start: s.start,
    end: s.end,
    capacity: s.capacity,
    level: { zh: s.levelZh, en: s.levelEn },
    status: sessionStatusDbToKey(s.status),
    startDate: s.startDate ? formatDateOnly(s.startDate) : null,
    endDate: s.endDate ? formatDateOnly(s.endDate) : null,
  }
}

export function mapClassClosure(c: DbClassClosure): ClassClosure {
  return {
    id: c.id,
    startDate: formatDateOnly(c.startDate),
    endDate: formatDateOnly(c.endDate),
    note: c.note,
    sessionId: c.sessionId,
  }
}

// A student's own booking for one real occurrence, with the session's
// display fields folded in. `b.state` is expected to already be filtered to
// BOOKED/WAITLIST by the caller's query — never pass a CANCELED booking in.
export function mapUpcomingBooking(b: DbBooking & { session: DbClassSession }): UpcomingBooking {
  return {
    bookingId: b.id,
    sessionId: b.sessionId,
    style: styleDbToKey(b.session.style),
    teacherId: b.session.teacherId,
    roomId: b.session.roomId,
    day: b.session.day,
    date: toISODate(b.date),
    start: b.session.start,
    end: b.session.end,
    myState: b.state === "BOOKED" ? "booked" : "waitlist",
  }
}

// Same shape for a past occurrence — the "history" list cares whether the
// student checked in, not their (now-moot) booked/waitlist state.
export function mapPastBooking(b: DbBooking & { session: DbClassSession }): PastBooking {
  return {
    bookingId: b.id,
    sessionId: b.sessionId,
    style: styleDbToKey(b.session.style),
    teacherId: b.session.teacherId,
    roomId: b.session.roomId,
    day: b.session.day,
    date: toISODate(b.date),
    start: b.session.start,
    end: b.session.end,
    checkedIn: b.checkedIn,
  }
}

export const mapStudentCard = (c: DbStudentCard): StudentCard => ({
  id: c.id,
  type: cardTypeDbToKey(c.type),
  name: { zh: c.nameZh, en: c.nameEn },
  balance: c.isUnlimited ? "unlimited" : (c.balance ?? 0),
  total: c.total,
  expiry: formatDateISO(c.expiry),
  daysLeft: daysLeftFrom(c.expiry),
})

export const mapLedgerEntry = (e: DbLedgerEntry): LedgerEntry => ({
  id: e.id,
  kind: ledgerKindDbToKey(e.kind),
  title: { zh: e.titleZh, en: e.titleEn },
  date: formatLedgerDate(e.date),
  delta: e.delta,
  note: e.noteZh || e.noteEn ? { zh: e.noteZh ?? "", en: e.noteEn ?? "" } : undefined,
})

export const mapLedgerEntryDateOnly = (e: DbLedgerEntry): LedgerEntry => ({
  id: e.id,
  kind: ledgerKindDbToKey(e.kind),
  title: { zh: e.titleZh, en: e.titleEn },
  date: formatDateOnly(e.date),
  delta: e.delta,
  note: e.noteZh || e.noteEn ? { zh: e.noteZh ?? "", en: e.noteEn ?? "" } : undefined,
})

export const mapCardProduct = (p: DbCardProduct): CardProduct => ({
  id: p.id,
  type: cardTypeDbToKey(p.type),
  name: { zh: p.nameZh, en: p.nameEn },
  price: p.price,
  sessions: p.isUnlimited ? "unlimited" : (p.sessions ?? 0),
  validityDays: p.validityDays,
})

export const mapCashierEntry = (
  p: DbPayment & { student: { name: string }; card: { nameZh: string; nameEn: string } | null },
): CashierEntry => ({
  id: p.id,
  studentName: p.student.name,
  cardName: p.card ? { zh: p.card.nameZh, en: p.card.nameEn } : null,
  amount: p.amount,
  method: paymentMethodDbToKey(p.method),
  paidAt: formatDateOnly(p.paidAt),
})

export function mapUser(u: DbUser & { student: { name: string } | null; teacher: { name: string } | null }): AppUser {
  return {
    id: u.id,
    username: u.username,
    role: userRoleDbToKey(u.role),
    linkedName: u.student?.name ?? u.teacher?.name ?? null,
    mustChangePassword: u.mustChangePassword,
    createdAt: formatDateISO(u.createdAt),
  }
}

export function mapBackupRecord(r: DbBackupRecord): BackupRecordEntry {
  return {
    id: r.id,
    action: r.action === "BACKUP" ? "backup" : "restore",
    filename: r.filename,
    status: r.status === "SUCCESS" ? "success" : "failed",
    message: r.message,
    createdBy: r.createdBy,
    createdAt: formatLedgerDate(r.createdAt),
  }
}

// Real purchases/gifts/adjustments always carry a cardId and are already
// reflected in that card's balance — only legacy-migrated ledger rows
// (cardId null, no StudentCard was ever created for them) need their net
// delta added on top, or legacy students would show 0 for everything.
export function computeRemainingBalance(cards: DbStudentCard[], ledgerEntries: DbLedgerEntry[]): number {
  const cardBalance = cards.reduce((sum, c) => (c.isUnlimited ? sum : sum + (c.balance ?? 0)), 0)
  const cardlessNet = ledgerEntries.filter((e) => !e.cardId).reduce((sum, e) => sum + e.delta, 0)
  return cardBalance + cardlessNet
}

export function mapStudent(
  s: DbStudent & { cards: DbStudentCard[]; ledgerEntries?: DbLedgerEntry[] },
  opts: { includeCardDetails?: boolean; includeUsageHistory?: boolean; includeCheckInCode?: boolean } = {},
): Student {
  const ledgerEntries = s.ledgerEntries ?? []
  const totalBalance = computeRemainingBalance(s.cards, ledgerEntries)
  // Every negative delta is a session consumed, whether a CONSUME booking or
  // a manual negative ADJUST (e.g. the walk-in-guest double-charge case) —
  // summing by sign rather than by kind avoids re-special-casing each kind.
  const usedSessions = opts.includeUsageHistory
    ? ledgerEntries.reduce((sum, e) => sum + Math.max(0, -e.delta), 0)
    : undefined
  const usageHistory = opts.includeUsageHistory
    ? ledgerEntries.filter((e) => e.delta < 0).map(mapLedgerEntryDateOnly)
    : undefined
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    wechat: s.wechat,
    email: s.email,
    code: s.code,
    cards: s.cards.length,
    totalBalance,
    joined: s.joined,
    status: studentStatusDbToKey(s.status),
    cardDetails: opts.includeCardDetails ? s.cards.map(mapStudentCard) : undefined,
    usedSessions,
    usageHistory,
    checkInCode: opts.includeCheckInCode ? s.checkInCode : undefined,
  }
}
