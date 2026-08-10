// Centralized mock data for the Agu Dance Studio management platform.
// All UI reads from here so a real backend can later replace it 1:1.

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

export const teachers: Teacher[] = [
  { id: "t1", name: "林薇", nameEn: "Wei Lin", avatar: "/teacher-wei.jpg", styles: ["style.jazz", "style.kpop"] },
  { id: "t2", name: "陈曜", nameEn: "Yao Chen", avatar: "/teacher-yao.jpg", styles: ["style.hiphop"] },
  { id: "t3", name: "苏晴", nameEn: "Qing Su", avatar: "/teacher-qing.jpg", styles: ["style.ballet", "style.contemporary"] },
  { id: "t4", name: "Marco", nameEn: "Marco", avatar: "/teacher-marco.jpg", styles: ["style.latin"] },
]

export const rooms = [
  { id: "r1", name: "1 号厅", nameEn: "Studio A" },
  { id: "r2", name: "2 号厅", nameEn: "Studio B" },
  { id: "r3", name: "3 号厅", nameEn: "Studio C" },
]

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

export const sessions: ClassSession[] = [
  { id: "c1", style: "style.jazz", teacherId: "t1", roomId: "r1", day: 0, date: "12.09", start: "19:00", end: "20:00", capacity: 12, booked: 8, level: { zh: "初级", en: "Beginner" }, myState: "booked" },
  { id: "c2", style: "style.hiphop", teacherId: "t2", roomId: "r2", day: 0, date: "12.09", start: "20:15", end: "21:15", capacity: 15, booked: 15, level: { zh: "中级", en: "Intermediate" }, myState: "waitlist" },
  { id: "c3", style: "style.ballet", teacherId: "t3", roomId: "r3", day: 1, date: "12.10", start: "10:00", end: "11:00", capacity: 10, booked: 4, level: { zh: "形体基础", en: "Foundation" } },
  { id: "c4", style: "style.kpop", teacherId: "t1", roomId: "r1", day: 1, date: "12.10", start: "19:30", end: "20:30", capacity: 16, booked: 11, level: { zh: "编舞", en: "Choreo" } },
  { id: "c5", style: "style.contemporary", teacherId: "t3", roomId: "r2", day: 2, date: "12.11", start: "19:00", end: "20:30", capacity: 12, booked: 9, level: { zh: "进阶", en: "Advanced" } },
  { id: "c6", style: "style.latin", teacherId: "t4", roomId: "r1", day: 3, date: "12.12", start: "20:00", end: "21:00", capacity: 14, booked: 6, level: { zh: "零基础", en: "Intro" } },
  { id: "c7", style: "style.hiphop", teacherId: "t2", roomId: "r3", day: 4, date: "12.13", start: "18:30", end: "19:30", capacity: 15, booked: 15, level: { zh: "初级", en: "Beginner" } },
  { id: "c8", style: "style.jazz", teacherId: "t1", roomId: "r2", day: 5, date: "12.14", start: "14:00", end: "15:00", capacity: 12, booked: 7, level: { zh: "中级", en: "Intermediate" }, myState: "booked" },
  { id: "c9", style: "style.kpop", teacherId: "t1", roomId: "r1", day: 5, date: "12.14", start: "16:00", end: "17:00", capacity: 16, booked: 13, level: { zh: "编舞", en: "Choreo" } },
  { id: "c10", style: "style.ballet", teacherId: "t3", roomId: "r3", day: 6, date: "12.15", start: "11:00", end: "12:00", capacity: 10, booked: 5, level: { zh: "形体基础", en: "Foundation" } },
]

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

export const myCards: StudentCard[] = [
  { id: "sc1", type: "stu.card.times", name: { zh: "48 次通卡", en: "48-class pack" }, balance: 21, total: 48, expiry: "2026-03-31", daysLeft: 234 },
  { id: "sc2", type: "stu.card.period", name: { zh: "季度不限卡", en: "Quarterly unlimited" }, balance: "unlimited", total: null, expiry: "2026-01-15", daysLeft: 158 },
  { id: "sc3", type: "stu.card.trial", name: { zh: "新人体验卡", en: "Trial card" }, balance: 1, total: 3, expiry: "2025-12-25", daysLeft: 15 },
]

export type LedgerEntry = {
  id: string
  kind: "ledger.consume" | "ledger.recharge" | "ledger.gift" | "ledger.refund"
  title: { zh: string; en: string }
  date: string
  delta: number // classes; negative = consumed
  note?: { zh: string; en: string }
}

export const myLedger: LedgerEntry[] = [
  { id: "l1", kind: "ledger.consume", title: { zh: "爵士舞 · 林薇", en: "Jazz · Wei Lin" }, date: "12.07 19:00", delta: -1 },
  { id: "l2", kind: "ledger.recharge", title: { zh: "48 次通卡充值", en: "48-class pack top-up" }, date: "12.01 10:22", delta: 48 },
  { id: "l3", kind: "ledger.consume", title: { zh: "韩舞 · 林薇", en: "K-Pop · Wei Lin" }, date: "11.28 19:30", delta: -1 },
  { id: "l4", kind: "ledger.gift", title: { zh: "生日赠课", en: "Birthday gift" }, date: "11.20 09:00", delta: 2, note: { zh: "会员生日福利", en: "Member birthday perk" } },
  { id: "l5", kind: "ledger.consume", title: { zh: "现代舞 · 苏晴", en: "Contemporary · Qing Su" }, date: "11.18 19:00", delta: -1 },
]

export type Student = {
  id: string
  name: string
  phone: string
  cards: number
  totalBalance: number
  joined: string
  status: "active" | "expiring" | "inactive"
}

export const students: Student[] = [
  { id: "s1", name: "王梓涵", phone: "138****2201", cards: 2, totalBalance: 21, joined: "2024-06", status: "active" },
  { id: "s2", name: "赵敏", phone: "139****8834", cards: 1, totalBalance: 3, joined: "2025-01", status: "expiring" },
  { id: "s3", name: "Emily Zhang", phone: "137****4590", cards: 1, totalBalance: 0, joined: "2023-11", status: "inactive" },
  { id: "s4", name: "刘一诺", phone: "150****7712", cards: 3, totalBalance: 44, joined: "2024-09", status: "active" },
  { id: "s5", name: "孙悦", phone: "188****3345", cards: 1, totalBalance: 6, joined: "2025-03", status: "active" },
  { id: "s6", name: "周子墨", phone: "136****1198", cards: 2, totalBalance: 2, joined: "2024-02", status: "expiring" },
]

export type CardProduct = {
  id: string
  type: CardType
  name: { zh: string; en: string }
  price: number
  sessions: number | "unlimited"
  validityDays: number
}

export const cardProducts: CardProduct[] = [
  { id: "p1", type: "stu.card.times", name: { zh: "12 次卡", en: "12-class card" }, price: 1680, sessions: 12, validityDays: 180 },
  { id: "p2", type: "stu.card.times", name: { zh: "48 次通卡", en: "48-class pack" }, price: 5760, sessions: 48, validityDays: 365 },
  { id: "p3", type: "stu.card.period", name: { zh: "季度不限卡", en: "Quarterly unlimited" }, price: 3980, sessions: "unlimited", validityDays: 90 },
  { id: "p4", type: "stu.card.trial", name: { zh: "新人体验卡", en: "Trial card" }, price: 99, sessions: 3, validityDays: 30 },
]

// Roster for teacher roll-call view
export type RosterEntry = { id: string; name: string; checkedIn: boolean; proxy?: boolean }
export const roster: RosterEntry[] = [
  { id: "s1", name: "王梓涵", checkedIn: true },
  { id: "s4", name: "刘一诺", checkedIn: true },
  { id: "s5", name: "孙悦", checkedIn: false },
  { id: "s2", name: "赵敏", checkedIn: true, proxy: true },
  { id: "s6", name: "周子墨", checkedIn: false },
  { id: "s7", name: "李思远", checkedIn: true },
  { id: "s8", name: "陈露", checkedIn: false },
  { id: "s9", name: "Nina", checkedIn: true },
]

// Finance / analytics
export const cashFlow = [
  { month: "7月", en: "Jul", value: 82000 },
  { month: "8月", en: "Aug", value: 91000 },
  { month: "9月", en: "Sep", value: 78000 },
  { month: "10月", en: "Oct", value: 104000 },
  { month: "11月", en: "Nov", value: 118000 },
  { month: "12月", en: "Dec", value: 96000 },
]

export const consumptionByStyle: { style: StyleKey; value: number }[] = [
  { style: "style.jazz", value: 320 },
  { style: "style.hiphop", value: 280 },
  { style: "style.kpop", value: 240 },
  { style: "style.ballet", value: 160 },
  { style: "style.contemporary", value: 140 },
  { style: "style.latin", value: 90 },
]

export const teacherStats = [
  { teacherId: "t1", heads: 412, commission: 12360 },
  { teacherId: "t2", heads: 286, commission: 8580 },
  { teacherId: "t3", heads: 244, commission: 7320 },
  { teacherId: "t4", heads: 118, commission: 3540 },
]

export const adminKpis = {
  revenue: 96000,
  consumed: 1230,
  headcount: 1060,
  activeStudents: 214,
}

export type NotificationRule = {
  id: string
  key: string
  channel: { zh: string; en: string }
  enabled: boolean
  sample: { zh: string; en: string }
}

export const notificationRules: NotificationRule[] = [
  { id: "n1", key: "notif.bookSuccess", channel: { zh: "微信 · 短信", en: "WeChat · SMS" }, enabled: true, sample: { zh: "您已成功预约 12/09 19:00 爵士舞（林薇）", en: "Booked: Jazz w/ Wei Lin, Dec 9 19:00" } },
  { id: "n2", key: "notif.waitlistSuccess", channel: { zh: "微信", en: "WeChat" }, enabled: true, sample: { zh: "候补成功！12/09 20:15 嘻哈街舞 已为您占位", en: "Promoted from waitlist: Hip-Hop, Dec 9 20:15" } },
  { id: "n3", key: "notif.classReminder", channel: { zh: "微信 · 推送", en: "WeChat · Push" }, enabled: true, sample: { zh: "距离上课还有 2 小时，记得提前到场热身～", en: "Class in 2 hours — arrive early to warm up." } },
  { id: "n4", key: "notif.lowBalance", channel: { zh: "短信", en: "SMS" }, enabled: true, sample: { zh: "您的次卡仅剩 2 节，续费享 9 折", en: "Only 2 classes left — renew for 10% off." } },
  { id: "n5", key: "notif.expiring", channel: { zh: "微信", en: "WeChat" }, enabled: false, sample: { zh: "体验卡将于 12/25 到期，别浪费额度哦", en: "Trial card expires Dec 25 — use it up!" } },
]

export const weekdayKeys = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"]
