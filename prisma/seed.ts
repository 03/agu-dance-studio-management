// Seeds the dev database with the same reference data the app used to ship
// as static mock data (lib/mock-data.ts, now removed), plus enough
// synthetic students/bookings/payments/ledger history for the admin
// analytics (cash flow, consumption by style, KPIs) to aggregate something
// non-trivial. Dates are anchored to `new Date()` at seed time rather than
// the old mock's hardcoded "12.09"-style dates, since those were written
// against a different implicit "today".
//
// Run via `prisma db seed` (wired through prisma.config.ts -> tsx).
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"
import { hashPassword } from "../lib/password"
import { nextOccurrence } from "../lib/schedule-dates"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DAY_MS = 86_400_000
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS)

// Small deterministic PRNG (mulberry32) so re-running the seed against a
// fresh DB produces the same data every time, without hand-enumerating
// every booking assignment.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260814)

// day (0=Mon..6=Sun) per seeded ClassSession — used to anchor seeded
// Bookings to that session's next real occurrence date, same as the app
// itself would compute via nextOccurrence().
const SESSION_DAY: Record<string, number> = {
  c1: 1,
  c2: 3,
  c3: 5,
  c4: 6,
  c5: 2,
  c6: 3,
  c7: 4,
  c8: 6,
}

async function main() {
  // ---- Teachers / Rooms ----
  await prisma.teacher.createMany({
    data: [
      { id: "t1", name: "阿古", nameEn: "Agu", avatar: "/teacher-agu.jpg", styles: ["JAZZ", "KPOP"] },
      { id: "t2", name: "陈曜", nameEn: "Yao Chen", avatar: "/teacher-yao.jpg", styles: ["HIPHOP"] },
      { id: "t3", name: "苏晴", nameEn: "Qing Su", avatar: "/teacher-qing.jpg", styles: ["BALLET", "CONTEMPORARY"] },
      { id: "t4", name: "Marco", nameEn: "Marco", avatar: "/teacher-marco.jpg", styles: ["LATIN"] },
    ],
  })
  await prisma.room.createMany({
    data: [
      { id: "r1", code: "STU-01", name: "Glen Waverley", nameEn: "Glen Waverley", address: "6D Aristoc Rd, Glen Waverley", postalCode: "3150", notes: "大班课" },
      { id: "r2", code: "STU-02", name: "Doncaster", nameEn: "Doncaster", address: "Doncaster Library", postalCode: "3108", notes: "大班课" },
      { id: "r3", code: "STU-03", name: "Mitcham", nameEn: "Mitcham", address: "21 Rooks Rd, Mitcham", postalCode: "3132", notes: "大班课（成人，少儿）" },
    ],
  })

  // ---- Class sessions (fixed demo-week schedule, matches old mock) ----
  await prisma.classSession.createMany({
    data: [
      { id: "c1", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r1", day: 1, start: "19:30", end: "21:30", capacity: 20, levelZh: "基础班", levelEn: "Beginner+" },
      { id: "c2", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r1", day: 3, start: "19:30", end: "21:30", capacity: 20, levelZh: "零基础入门班", levelEn: "Starter" },
      { id: "c3", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r1", day: 5, start: "19:15", end: "21:15", capacity: 20, levelZh: "入门班", levelEn: "Beginner" },
      { id: "c4", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r3", day: 6, start: "19:00", end: "21:00", capacity: 20, levelZh: "零基础入门班", levelEn: "Starter" },

      { id: "c5", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r2", day: 2, start: "10:30", end: "12:30", capacity: 20, levelZh: "基础班", levelEn: "Beginner+" },
      { id: "c6", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r2", day: 3, start: "10:30", end: "12:30", capacity: 20, levelZh: "入门班", levelEn: "Beginner" },
      { id: "c7", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r2", day: 4, start: "10:00", end: "12:00", capacity: 20, levelZh: "零基础入门班", levelEn: "Starter" },
      { id: "c8", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r3", day: 6, start: "11:30", end: "13:00", capacity: 20, levelZh: "少儿（7+）基础班", levelEn: "Teens(7+) Beginner" },

      // { id: "c1", style: "JAZZ", teacherId: "t1", roomId: "r1", day: 0, start: "19:00", end: "20:00", capacity: 12, levelZh: "初级", levelEn: "Beginner" },
      // { id: "c2", style: "HIPHOP", teacherId: "t2", roomId: "r2", day: 0, start: "20:15", end: "21:15", capacity: 15, levelZh: "中级", levelEn: "Intermediate" },
      // { id: "c3", style: "BALLET", teacherId: "t3", roomId: "r3", day: 1, start: "10:00", end: "11:00", capacity: 10, levelZh: "形体基础", levelEn: "Foundation" },
      // { id: "c4", style: "KPOP", teacherId: "t1", roomId: "r1", day: 1, start: "19:30", end: "20:30", capacity: 16, levelZh: "编舞", levelEn: "Choreo" },
      // { id: "c5", style: "CONTEMPORARY", teacherId: "t3", roomId: "r2", day: 2, start: "19:00", end: "20:30", capacity: 12, levelZh: "进阶", levelEn: "Advanced" },
      // { id: "c6", style: "LATIN", teacherId: "t4", roomId: "r1", day: 3, start: "20:00", end: "21:00", capacity: 14, levelZh: "零基础", levelEn: "Intro" },
      // { id: "c7", style: "HIPHOP", teacherId: "t2", roomId: "r3", day: 4, start: "18:30", end: "19:30", capacity: 15, levelZh: "初级", levelEn: "Beginner" },
      // { id: "c8", style: "JAZZ", teacherId: "t1", roomId: "r2", day: 5, start: "14:00", end: "15:00", capacity: 12, levelZh: "中级", levelEn: "Intermediate" },
      // { id: "c9", style: "KPOP", teacherId: "t1", roomId: "r1", day: 5, start: "16:00", end: "17:00", capacity: 16, levelZh: "编舞", levelEn: "Choreo" },
      // { id: "c10", style: "BALLET", teacherId: "t3", roomId: "r3", day: 6, start: "11:00", end: "12:00", capacity: 10, levelZh: "形体基础", levelEn: "Foundation" },
    ],
  })

  // ---- Card products (on sale) ----
  await prisma.cardProduct.createMany({
    data: [
      { id: "p1", type: "TIMES", nameZh: "10 次卡", nameEn: "12-class card", price: 400, sessions: 10, isUnlimited: false, validityDays: 180 },
      { id: "p2", type: "TIMES", nameZh: "21 次卡", nameEn: "48-class pack", price: 800, sessions: 21, isUnlimited: false, validityDays: 365 },
      { id: "p3", type: "PERIOD", nameZh: "季度不限卡", nameEn: "Quarterly unlimited", price: 3980, sessions: null, isUnlimited: true, validityDays: 90 },
      { id: "p4", type: "TRIAL", nameZh: "新人体验卡", nameEn: "Trial card", price: 40, sessions: 3, isUnlimited: false, validityDays: 30 },
    ],
  })

  // ---- Notification rules ----
  await prisma.notificationRule.createMany({
    data: [
      { id: "n1", key: "notif.bookSuccess", channelZh: "微信 · 短信", channelEn: "WeChat · SMS", enabled: true, sampleZh: "您已成功预约 12/09 19:00 爵士舞（林薇）", sampleEn: "Booked: Jazz w/ Wei Lin, Dec 9 19:00" },
      { id: "n2", key: "notif.waitlistSuccess", channelZh: "微信", channelEn: "WeChat", enabled: true, sampleZh: "候补成功！12/09 20:15 嘻哈街舞 已为您占位", sampleEn: "Promoted from waitlist: Hip-Hop, Dec 9 20:15" },
      { id: "n3", key: "notif.classReminder", channelZh: "微信 · 推送", channelEn: "WeChat · Push", enabled: true, sampleZh: "距离上课还有 2 小时，记得提前到场热身～", sampleEn: "Class in 2 hours — arrive early to warm up." },
      { id: "n4", key: "notif.lowBalance", channelZh: "短信", channelEn: "SMS", enabled: true, sampleZh: "您的次卡仅剩 2 节，续费享 9 折", sampleEn: "Only 2 classes left — renew for 10% off." },
      { id: "n5", key: "notif.expiring", channelZh: "微信", channelEn: "WeChat", enabled: false, sampleZh: "体验卡将于 12/25 到期，别浪费额度哦", sampleEn: "Trial card expires Dec 25 — use it up!" },
    ],
  })

  // ---- Teacher stats (fixed rollup, not recomputed live) ----
  await prisma.teacherStat.createMany({
    data: [
      { teacherId: "t1", heads: 412, commission: 12360 },
      { teacherId: "t2", heads: 286, commission: 8580 },
      { teacherId: "t3", heads: 244, commission: 7320 },
      { teacherId: "t4", heads: 118, commission: 3540 },
    ],
  })

  // ---- Named students (s1-s6 from the old mock table, s7-s9 previously
  // roster-only names with no backing Student row at all) ----
  await prisma.student.createMany({
    data: [
      { id: "s1", name: "王梓涵", phone: "138****2201", code: "M0001", joined: "2024-06", status: "ACTIVE" },
      { id: "s2", name: "赵敏", phone: "139****8834", code: "M0002", joined: "2025-01", status: "EXPIRING" },
      { id: "s3", name: "Emily Zhang", phone: "137****4590", code: "M0003", joined: "2023-11", status: "INACTIVE" },
      { id: "s4", name: "刘一诺", phone: "150****7712", code: "M0004", joined: "2024-09", status: "ACTIVE" },
      { id: "s5", name: "孙悦", phone: "188****3345", code: "M0005", joined: "2025-03", status: "ACTIVE" },
      { id: "s6", name: "周子墨", phone: "136****1198", code: "M0006", joined: "2024-02", status: "EXPIRING" },
      { id: "s7", name: "李思远", phone: "133****5566", code: "M0007", joined: "2025-05", status: "ACTIVE" },
      { id: "s8", name: "陈露", phone: "135****7788", code: "M0008", joined: "2025-02", status: "ACTIVE" },
      { id: "s9", name: "Nina", phone: "186****9900", code: "M0009", joined: "2024-11", status: "ACTIVE" },
    ],
  })

  // s1 (the demo "current student") gets the exact 3 cards from the old
  // mock myCards, with expiry re-anchored to today via the same daysLeft.
  await prisma.studentCard.createMany({
    data: [
      { id: "sc1", studentId: "s1", productId: "p2", type: "TIMES", nameZh: "48 次通卡", nameEn: "48-class pack", balance: 21, isUnlimited: false, total: 48, expiry: daysFromNow(234) },
      { id: "sc2", studentId: "s1", productId: "p3", type: "PERIOD", nameZh: "季度不限卡", nameEn: "Quarterly unlimited", balance: null, isUnlimited: true, total: null, expiry: daysFromNow(158) },
      { id: "sc3", studentId: "s1", productId: "p4", type: "TRIAL", nameZh: "新人体验卡", nameEn: "Trial card", balance: 1, isUnlimited: false, total: 3, expiry: daysFromNow(15) },
    ],
  })
  await prisma.ledgerEntry.createMany({
    data: [
      { id: "l1", studentId: "s1", cardId: "sc1", kind: "CONSUME", titleZh: "爵士舞 · 林薇", titleEn: "Jazz · Wei Lin", date: daysFromNow(-7), delta: -1 },
      { id: "l2", studentId: "s1", cardId: "sc1", kind: "RECHARGE", titleZh: "48 次通卡充值", titleEn: "48-class pack top-up", date: daysFromNow(-13), delta: 48 },
      { id: "l3", studentId: "s1", cardId: "sc1", kind: "CONSUME", titleZh: "韩舞 · 林薇", titleEn: "K-Pop · Wei Lin", date: daysFromNow(-16), delta: -1 },
      { id: "l4", studentId: "s1", cardId: "sc1", kind: "GIFT", titleZh: "生日赠课", titleEn: "Birthday gift", date: daysFromNow(-24), delta: 2, noteZh: "会员生日福利", noteEn: "Member birthday perk" },
      { id: "l5", studentId: "s1", cardId: "sc1", kind: "CONSUME", titleZh: "现代舞 · 苏晴", titleEn: "Contemporary · Qing Su", date: daysFromNow(-26), delta: -1 },
    ],
  })
  await prisma.payment.create({
    data: { studentId: "s1", cardId: "sc1", amount: 5760, paidAt: daysFromNow(-13) },
  })

  // ---- Synthetic students: booking/payment volume so sessions look
  // populated and the finance charts have something to aggregate. ----
  const surnames = ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "林", "何"]
  const givenNames = ["雨桐", "浩然", "欣怡", "梓睿", "思彤", "俊杰", "婉婷", "宇轩", "佳琪", "皓天", "梦瑶", "泽宇", "语嫣", "子涵", "沐辰", "静怡", "天佑", "紫萱"]
  const synthCount = 18
  const synthIds = Array.from({ length: synthCount }, (_, i) => `e${i + 1}`)
  await prisma.student.createMany({
    data: synthIds.map((id, i) => ({
      id,
      name: `${surnames[i % surnames.length]}${givenNames[i % givenNames.length]}`,
      phone: `1${(30 + i).toString().padStart(2, "0")}****${(1000 + i * 37).toString().slice(-4)}`,
      code: `M${String(10 + i).padStart(4, "0")}`,
      joined: `202${4 + (i % 3)}-${String(1 + (i % 12)).padStart(2, "0")}`,
      status: "ACTIVE",
    })),
  })

  const products = ["p1", "p2", "p3", "p4"] as const
  const productMeta: Record<(typeof products)[number], { type: "TIMES" | "PERIOD" | "TRIAL"; nameZh: string; nameEn: string; price: number; sessions: number | null; isUnlimited: boolean; validityDays: number }> = {
    p1: { type: "TIMES", nameZh: "10 次卡", nameEn: "12-class card", price: 400, sessions: 10, isUnlimited: false, validityDays: 180 },
    p2: { type: "TIMES", nameZh: "21 次卡", nameEn: "48-class pack", price: 800, sessions: 21, isUnlimited: false, validityDays: 365 },
    p3: { type: "PERIOD", nameZh: "季度不限卡", nameEn: "Quarterly unlimited", price: 3980, sessions: null, isUnlimited: true, validityDays: 90 },
    p4: { type: "TRIAL", nameZh: "新人体验卡", nameEn: "Trial card", price: 40, sessions: 1, isUnlimited: false, validityDays: 30 },
  }

  // Each synthetic student buys one card, purchased at a random point in the
  // last ~6 months, spent down by a few classes since.
  const synthCardId = (id: string) => `${id}-card`
  for (let i = 0; i < synthIds.length; i++) {
    const id = synthIds[i]
    const productId = products[i % products.length]
    const meta = productMeta[productId]
    const purchasedDaysAgo = 10 + Math.floor(rand() * 175) // within ~last 6 months
    const usedSoFar = meta.isUnlimited ? 0 : Math.floor(rand() * Math.min(4, meta.sessions ?? 0))
    await prisma.studentCard.create({
      data: {
        id: synthCardId(id),
        studentId: id,
        productId,
        type: meta.type,
        nameZh: meta.nameZh,
        nameEn: meta.nameEn,
        balance: meta.isUnlimited ? null : (meta.sessions ?? 0) - usedSoFar,
        isUnlimited: meta.isUnlimited,
        total: meta.sessions,
        expiry: daysFromNow(meta.validityDays - purchasedDaysAgo),
      },
    })
    await prisma.payment.create({
      data: { studentId: id, cardId: synthCardId(id), amount: meta.price, paidAt: daysFromNow(-purchasedDaysAgo) },
    })
  }

  // ---- Bookings ----
  // c1: reproduce the old flat roll-call roster exactly, now properly
  // scoped to one real session (t1's Monday jazz class).
  const c1Roster: { studentId: string; checkedIn: boolean; proxy?: boolean }[] = [
    { studentId: "s1", checkedIn: true },
    { studentId: "s4", checkedIn: true },
    { studentId: "s5", checkedIn: false },
    { studentId: "s2", checkedIn: true, proxy: true },
    { studentId: "s6", checkedIn: false },
    { studentId: "s7", checkedIn: true },
    { studentId: "s8", checkedIn: false },
    { studentId: "s9", checkedIn: true },
  ]
  await prisma.booking.createMany({
    data: c1Roster.map((r) => ({
      studentId: r.studentId,
      sessionId: "c1",
      date: nextOccurrence(SESSION_DAY.c1),
      state: "BOOKED",
      checkedIn: r.checkedIn,
      proxy: r.proxy ?? false,
    })),
  })

  // Remaining sessions: fill from the synthetic pool with a deterministic
  // shuffle per session so counts vary and overlap naturally.
  function shuffledPool(offset: number) {
    const pool = [...synthIds]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool
  }

  const otherSessions: { id: string; count: number; extra?: { studentId: string; state: "BOOKED" | "WAITLIST" } }[] = [
    { id: "c2", count: 15, extra: { studentId: "s1", state: "WAITLIST" } }, // full; s1 waitlisted
    { id: "c3", count: 4 },
    { id: "c4", count: 11 },
    { id: "c5", count: 9 },
    { id: "c6", count: 6 },
    { id: "c7", count: 15 },
    { id: "c8", count: 6, extra: { studentId: "s1", state: "BOOKED" } }, // s1 booked here too
  ]

  for (const s of otherSessions) {
    const occurrenceDate = nextOccurrence(SESSION_DAY[s.id])
    const pool = shuffledPool(s.count)
    const chosen = pool.slice(0, Math.min(s.count, pool.length))
    await prisma.booking.createMany({
      data: chosen.map((studentId) => ({ studentId, sessionId: s.id, date: occurrenceDate, state: "BOOKED" as const })),
    })
    if (s.extra) {
      await prisma.booking.create({
        data: { studentId: s.extra.studentId, sessionId: s.id, date: occurrenceDate, state: s.extra.state },
      })
    }
  }

  // ---- Historical consumption: for a chunk of the bookings just created,
  // pretend the class already happened — log a CONSUME ledger entry and
  // spend down that student's card, so consumptionByStyle has real spread
  // across styles/teachers. Skip s1's bookings (those stay "upcoming" for
  // the student-app demo) and skip students with no spendable balance. ----
  const allBookings = await prisma.booking.findMany({
    where: { state: "BOOKED", studentId: { not: "s1" } },
    include: { session: { include: { teacher: true } } },
  })
  const STYLE_LABEL: Record<string, { zh: string; en: string }> = {
    JAZZ_KPOP: { zh: "爵士舞", en: "Jazz/Kpop" },
    JAZZ: { zh: "爵士舞", en: "Jazz" },
    HIPHOP: { zh: "嘻哈街舞", en: "Hip-Hop" },
    BALLET: { zh: "芭蕾形体", en: "Ballet" },
    KPOP: { zh: "韩舞", en: "K-Pop" },
    CONTEMPORARY: { zh: "现代舞", en: "Contemporary" },
    LATIN: { zh: "拉丁舞", en: "Latin" },
  }
  for (const b of allBookings) {
    if (rand() > 0.55) continue // only "consume" a subset
    const card = await prisma.studentCard.findUnique({ where: { id: synthCardId(b.studentId) } })
    if (!card) continue
    const label = STYLE_LABEL[b.session.style]
    const consumedDaysAgo = 1 + Math.floor(rand() * 60)
    if (!card.isUnlimited) {
      if ((card.balance ?? 0) <= 0) continue
      await prisma.studentCard.update({ where: { id: card.id }, data: { balance: { decrement: 1 } } })
    }
    await prisma.ledgerEntry.create({
      data: {
        studentId: b.studentId,
        cardId: card.id,
        bookingId: b.id,
        kind: "CONSUME",
        titleZh: `${label.zh} · ${b.session.teacher.name}`,
        titleEn: `${label.en} · ${b.session.teacher.nameEn}`,
        date: daysFromNow(-consumedDaysAgo),
        delta: -1,
      },
    })
  }

  // ---- Login accounts. One admin, plus a handful of the seeded
  // students/teachers get real logins — including s1/t1, the app's old
  // hardcoded demo identities, so the existing demo narrative keeps working
  // end-to-end through real login instead of a shortcut constant. ----
  const demoPasswordHash = await hashPassword("demo1234")
  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash: await hashPassword("admin1234"), role: "ADMIN" },
      { username: "wangzihan", passwordHash: demoPasswordHash, role: "STUDENT", studentId: "s1" },
      { username: "zhaomin", passwordHash: demoPasswordHash, role: "STUDENT", studentId: "s2" },
      { username: "linwei", passwordHash: demoPasswordHash, role: "TEACHER", teacherId: "t1" },
      { username: "chenyao", passwordHash: demoPasswordHash, role: "TEACHER", teacherId: "t2" },
    ],
  })

  console.log("Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
