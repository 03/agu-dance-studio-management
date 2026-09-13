// Run via `prisma db seed` (wired through prisma.config.ts -> tsx).
import {PrismaMariaDb} from "@prisma/adapter-mariadb"
import {PrismaClient} from "../lib/generated/prisma/client"
import {parseConnectionString} from "../lib/db-connection"
import {hashPassword} from "../lib/password"
import {styleDbToKey, styleLabel} from "../lib/mappers"
import {parseISODate} from "../lib/schedule-dates"

const adapter = new PrismaMariaDb(parseConnectionString(process.env.DATABASE_URL))
const prisma = new PrismaClient({ adapter })

async function main() {
  // ---- Teachers / Rooms ----
  await prisma.teacher.createMany({
    data: [
      { id: "t1", name: "阿古", nameEn: "Agu", avatar: "/teacher-agu.jpg", styles: ["JAZZ", "KPOP"] },
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
      { id: "c1", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r1", day: 1, start: "19:30", end: "21:30", capacity: 40, levelZh: "基础班", levelEn: "Beginner+" },
      { id: "c2", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r1", day: 3, start: "19:30", end: "21:30", capacity: 40, levelZh: "零基础入门班", levelEn: "Starter" },
      { id: "c3", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r1", day: 5, start: "19:15", end: "21:15", capacity: 40, levelZh: "入门班", levelEn: "Beginner" },
      { id: "c4", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r3", day: 6, start: "19:00", end: "21:00", capacity: 40, levelZh: "零基础入门班", levelEn: "Starter" },

      { id: "c5", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r2", day: 2, start: "10:30", end: "12:30", capacity: 40, levelZh: "基础班", levelEn: "Beginner+" },
      { id: "c6", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r2", day: 3, start: "10:30", end: "12:30", capacity: 40, levelZh: "入门班", levelEn: "Beginner" },
      { id: "c7", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r2", day: 4, start: "10:00", end: "12:00", capacity: 40, levelZh: "零基础入门班", levelEn: "Starter" },
      { id: "c8", style: "JAZZ_KPOP", teacherId: "t1", roomId: "r3", day: 6, start: "11:30", end: "13:00", capacity: 20, levelZh: "少儿（7+）基础班", levelEn: "Teens(7+) Beginner" },
    ],
  })

  // ---- Card products ----
  await prisma.cardProduct.createMany({
    data: [
      { id: "p1", type: "TIMES", nameZh: "10 次卡", nameEn: "10-class card", price: 400, sessions: 10, isUnlimited: false, validityDays: 180 },
      { id: "p2", type: "TIMES", nameZh: "21 次卡", nameEn: "21-class pack", price: 800, sessions: 21, isUnlimited: false, validityDays: 365 },
      { id: "p3", type: "TRIAL", nameZh: "体验卡", nameEn: "Trial card", price: 40, sessions: 1, isUnlimited: false, validityDays: 30 },
      { id: "p4", type: "TRIAL", nameZh: "体验卡（团体）", nameEn: "Trial card (group)", price: 35, sessions: 1, isUnlimited: false, validityDays: 30 },
    ],
  })

  // ---- Login accounts. This is the public demo deploy (see app-shell.tsx's
  // DEMO_MODE_ENABLED banner), so these use one shared, easy-to-type
  // password rather than a real studio's actual admin credential. student1
  // is linked below in seedDemoHistory(), once demo Student rows exist. ----
  await prisma.user.createMany({
    data: [
      { username: "admin1", passwordHash: await hashPassword("demo1234"), role: "ADMIN" },
      { username: "teacher1", passwordHash: await hashPassword("demo1234"), role: "TEACHER", teacherId: "t1" },
    ],
  })

  await seedDemoHistory()

  console.log("Seed complete.")
}

// Purely additive demo history — students, a few extra teachers and class
// sessions in other dance styles, and past bookings/payments — so a freshly
// seeded install doesn't look like it was created five minutes ago and
// doesn't look like a one-style studio. Deliberately never touches the
// teacher/room/class_sessions/card_products/admin1+teacher1 data seeded above:
// every id here is its own new row, and every new class session below is
// scheduled into a day/room/time slot the fixed c1-c8 schedule doesn't use
// (so nothing double-books a room).
async function seedDemoHistory() {
  const EXTRA_TEACHERS = [
    { id: "t2", name: "小美", nameEn: "Mia", avatar: "/placeholder-user.jpg", styles: ["HIPHOP", "LATIN"] as const },
    { id: "t3", name: "思婷", nameEn: "Sophie", avatar: "/placeholder-user.jpg", styles: ["BALLET"] as const },
    { id: "t4", name: "俊宇", nameEn: "Jun", avatar: "/placeholder-user.jpg", styles: ["CONTEMPORARY"] as const },
  ]
  await prisma.teacher.createMany({ data: EXTRA_TEACHERS })
  await prisma.user.createMany({
    data: [
      { username: "mia1", passwordHash: await hashPassword("demo1234"), role: "TEACHER", teacherId: "t2" },
      { username: "sophie1", passwordHash: await hashPassword("demo1234"), role: "TEACHER", teacherId: "t3" },
      { username: "jun1", passwordHash: await hashPassword("demo1234"), role: "TEACHER", teacherId: "t4" },
    ],
  })

  // New class sessions in styles the fixed c1-c8 schedule never uses
  // (those are all JAZZ_KPOP) — each in a day/room/time slot free of the
  // existing schedule, so 课程表 gains variety without touching it.
  await prisma.classSession.createMany({
    data: [
      { id: "c9", style: "JAZZ", teacherId: "t1", roomId: "r2", day: 0, start: "09:30", end: "11:00", capacity: 30, levelZh: "进阶班", levelEn: "Advanced" },
      { id: "c10", style: "HIPHOP", teacherId: "t2", roomId: "r1", day: 0, start: "19:30", end: "21:00", capacity: 30, levelZh: "基础班", levelEn: "Beginner+" },
      { id: "c11", style: "LATIN", teacherId: "t2", roomId: "r3", day: 0, start: "19:00", end: "20:30", capacity: 25, levelZh: "入门班", levelEn: "Beginner" },
      { id: "c12", style: "BALLET", teacherId: "t3", roomId: "r3", day: 2, start: "18:00", end: "19:30", capacity: 20, levelZh: "形体基础班", levelEn: "Beginner" },
      { id: "c13", style: "CONTEMPORARY", teacherId: "t4", roomId: "r1", day: 4, start: "19:30", end: "21:00", capacity: 25, levelZh: "基础班", levelEn: "Beginner+" },
      { id: "c14", style: "KPOP", teacherId: "t1", roomId: "r2", day: 5, start: "14:00", end: "15:30", capacity: 30, levelZh: "入门班", levelEn: "Beginner" },
    ],
  })

  // Fictional names only — not a real student's name from anywhere this
  // app has ever actually been used with. The 24 hand-picked ones come
  // first (kept as-is, including the two note-bearing students below which
  // index into this array), then generateDemoNames() fills the rest by
  // combining surname/given-name/English-name pools so every class ends up
  // with enough students to reach a realistic 5-15 sign-ups per occurrence
  // (see STUDENT_COUNT below) without hand-typing that many names.
  const HAND_PICKED_NAMES = [
    "王小美", "Sunny 陈", "李佳怡", "Coco 张", "林晓彤", "Bella 黄", "赵梦琪", "Tiffany 刘",
    "周雨萱", "Kevin 吴", "孙悦", "Amy 徐", "郑思涵", "Leo 马", "何雨欣", "Grace 何",
    "谢佳琪", "Ethan 江", "韩雪儿", "Vivian 潘", "冯梓涵", "Jason 蔡", "曹语彤", "Nancy 邓",
  ]
  const SURNAMES = [
    "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴", "徐", "孙", "胡", "朱", "高",
    "林", "何", "郭", "马", "罗", "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧",
    "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕",
  ]
  const GIVEN_NAMES = [
    "雨萱", "佳怡", "梦琪", "雪儿", "思涵", "语彤", "晓彤", "梓涵", "若曦", "欣怡",
    "诗涵", "梦洁", "雅婷", "子涵", "晨曦", "心怡", "佳琪", "雨欣", "梓萱", "雨桐",
    "梦瑶", "欣妍", "雨凝", "思佳", "梦琳", "雅琪", "雨嫣", "诗琪", "梦妍", "雨薇",
  ]
  const EN_NAMES = [
    "Sunny", "Coco", "Bella", "Tiffany", "Amy", "Grace", "Vivian", "Nancy", "Kevin", "Leo",
    "Ethan", "Jason", "Mia", "Zoe", "Ivy", "Ella", "Ruby", "Kate", "Lily", "Sam",
    "Max", "Owen", "Alex", "Chris", "Emma", "Olivia", "Luna", "Nora", "Iris", "Cleo",
  ]
  function generateDemoNames(count: number): string[] {
    const names: string[] = [...HAND_PICKED_NAMES]
    const seen = new Set(names)
    let si = 0, gi = 7, ei = 0 // gi starts offset from si so the pairing doesn't repeat in lockstep
    while (names.length < count) {
      const useEnglish = names.length % 3 === 0
      let candidate: string
      if (useEnglish) {
        const en = EN_NAMES[ei % EN_NAMES.length]
        const sur = SURNAMES[Math.floor(ei / EN_NAMES.length) % SURNAMES.length]
        candidate = `${en} ${sur}`
        ei++
      } else {
        const sur = SURNAMES[si % SURNAMES.length]
        const giv = GIVEN_NAMES[gi % GIVEN_NAMES.length]
        candidate = `${sur}${giv}`
        si++
        gi++
      }
      if (!seen.has(candidate)) {
        seen.add(candidate)
        names.push(candidate)
      }
    }
    return names
  }
  // 14 sessions, ~75% attendance per home student — this count targets an
  // average of ~10 registered students per class occurrence (180 * 0.75 /
  // 14 ≈ 9.6), landing in the requested 5-15 range.
  const STUDENT_COUNT = 180
  const DEMO_STUDENT_NAMES = generateDemoNames(STUDENT_COUNT)

  // One entry per bookable session (the fixed c1-c8 plus the new c9-c14
  // above), with the style/teacher a booking against it should show in
  // 课时消费's ledger title — every session here is JAZZ_KPOP/阿古 for
  // c1-c8, but each new session has its own style and teacher.
  const CLASS_SESSIONS = [
    { id: "c1", day: 1, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c2", day: 3, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c3", day: 5, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c4", day: 6, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c5", day: 2, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c6", day: 3, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c7", day: 4, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c8", day: 6, style: "JAZZ_KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c9", day: 0, style: "JAZZ" as const, teacherName: "阿古", teacherNameEn: "Agu" },
    { id: "c10", day: 0, style: "HIPHOP" as const, teacherName: "小美", teacherNameEn: "Mia" },
    { id: "c11", day: 0, style: "LATIN" as const, teacherName: "小美", teacherNameEn: "Mia" },
    { id: "c12", day: 2, style: "BALLET" as const, teacherName: "思婷", teacherNameEn: "Sophie" },
    { id: "c13", day: 4, style: "CONTEMPORARY" as const, teacherName: "俊宇", teacherNameEn: "Jun" },
    { id: "c14", day: 5, style: "KPOP" as const, teacherName: "阿古", teacherNameEn: "Agu" },
  ]
  // 0 = Mon..6 = Sun (this app's day convention) for a plain JS Date.
  const toAppDay = (d: Date) => (d.getDay() + 6) % 7
  const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  // Every date a given weekday actually fell on between [from, to)
  // (exclusive of `to`, so "yesterday" as the upper bound never includes
  // today itself). Returned as the same Melbourne-midnight UTC instant
  // parseISODate produces everywhere else in this app (Booking.date,
  // LedgerEntry.date, ...) — NOT plain `new Date(y,m,d)`, which encodes
  // midnight in whichever timezone the *process running this script*
  // happens to be in. That's fine when this happens to run somewhere
  // already set to Australia/Melbourne (silently "worked" locally), and
  // wrong everywhere else (a plain UTC container, e.g. deploying this
  // seed to a remote host) — off by the UTC offset, which every exact-date
  // lookup in this app (课时登记's roster, 接龙历史) requires matching
  // precisely; a monthly aggregate merely bucketing by day still looked
  // right by coincidence, which is what made this easy to miss.
  function occurrencesOf(appDay: number, from: Date, to: Date): Date[] {
    const dates: Date[] = []
    const d = new Date(from)
    d.setHours(0, 0, 0, 0)
    while (d < to) {
      if (toAppDay(d) === appDay) dates.push(parseISODate(isoOf(d)))
      d.setDate(d.getDate() + 1)
    }
    return dates
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const students: { id: string; name: string; phone: string; joined: string; status: "ACTIVE" | "EXPIRING" | "INACTIVE"; note: string | null }[] = []
  const cards: { id: string; studentId: string; productId: string; type: "TIMES"; nameZh: string; nameEn: string; balance: number; total: number; expiry: Date }[] = []
  const payments: { id: string; studentId: string; cardId: string; amount: number; paidAt: Date }[] = []
  const bookings: { id: string; studentId: string; sessionId: string; date: Date; checkedIn: boolean; createdAt: Date }[] = []
  const ledgerEntries: { id: string; studentId: string; cardId: string; bookingId: string; date: Date; delta: number; titleZh: string; titleEn: string }[] = []
  const bookingEvents: { id: string; sessionId: string; studentId: string; bookingId: string; date: Date; createdAt: Date }[] = []

  DEMO_STUDENT_NAMES.forEach((name, i) => {
    const n = i + 1
    const tenureMonths = 2 + (i % 7) // spread 2-8 months of "membership" across the batch
    const joinedDate = new Date(today.getFullYear(), today.getMonth() - tenureMonths, 1 + (i % 20))
    const status: "ACTIVE" | "EXPIRING" | "INACTIVE" = i % 11 === 10 ? "INACTIVE" : i % 7 === 6 ? "EXPIRING" : "ACTIVE"

    students.push({
      id: `ds${n}`,
      name,
      phone: `04${String(10000000 + n * 137).slice(0, 8)}`,
      joined: `${joinedDate.getFullYear()}-${String(joinedDate.getMonth() + 1).padStart(2, "0")}`,
      status,
      note: n === 3 ? "膝盖有旧伤，注意保护" : n === 12 ? "孕期学员，避免高强度跳跃动作" : null,
    })

    // Each student has one regular class (their "home" session).
    const home = CLASS_SESSIONS[i % CLASS_SESSIONS.length]
    const allOccurrences = occurrencesOf(home.day, joinedDate, today)
    // ~75% attendance rate — a real student doesn't make every single week.
    const attended = allOccurrences.filter((_, idx) => idx % 4 !== 3)

    const product = attended.length > 10 ? { id: "p2", sessions: 21, price: 800, validityDays: 365, nameZh: "21 次卡", nameEn: "21-class pack" }
      : { id: "p1", sessions: 10, price: 400, validityDays: 180, nameZh: "10 次卡", nameEn: "10-class card" }
    // Cap consumption at the card's own size (minus a small cushion so the
    // remaining balance looks like an active student, not one who's run out).
    const consumed = attended.slice(0, Math.max(0, product.sessions - 1 - (n % 3)))
    const label = styleLabel(styleDbToKey(home.style))

    const cardId = `dc${n}`
    cards.push({
      id: cardId,
      studentId: students[students.length - 1].id,
      productId: product.id,
      type: "TIMES",
      nameZh: product.nameZh,
      nameEn: product.nameEn,
      balance: product.sessions - consumed.length,
      total: product.sessions,
      expiry: new Date(joinedDate.getFullYear(), joinedDate.getMonth(), joinedDate.getDate() + product.validityDays),
    })
    payments.push({
      id: `dp${n}`,
      studentId: students[students.length - 1].id,
      cardId,
      amount: product.price,
      paidAt: joinedDate,
    })

    consumed.forEach((occurrenceDate, idx) => {
      const bookingId = `db${n}-${idx}`
      // A real registration timestamp, not literal midnight — spread across
      // the day so 报名时间/接龙历史 don't all show the same 00:00.
      const registeredAt = new Date(occurrenceDate.getTime() + ((idx * 37 + n * 13) % 20) * 3_600_000)
      bookings.push({
        id: bookingId,
        studentId: students[students.length - 1].id,
        sessionId: home.id,
        date: occurrenceDate,
        checkedIn: idx % 9 !== 8, // the occasional no-show
        createdAt: registeredAt,
      })
      ledgerEntries.push({
        id: `dl${n}-${idx}`,
        studentId: students[students.length - 1].id,
        cardId,
        bookingId,
        date: occurrenceDate,
        delta: -1,
        titleZh: `${label.zh} · ${home.teacherName}`,
        titleEn: `${label.en} · ${home.teacherNameEn}`,
      })
      // Every real booking has a matching BookingEvent (see
      // lib/actions/bookings.ts) — without one here, 课时登记's 接龙历史
      // would show these seeded bookings as if they'd never happened.
      bookingEvents.push({
        id: `de${n}-${idx}`,
        sessionId: home.id,
        studentId: students[students.length - 1].id,
        bookingId,
        date: occurrenceDate,
        createdAt: registeredAt,
      })
    })
  })

  await prisma.student.createMany({ data: students })
  // Demo login for the public homepage banner — links to the first demo
  // student (ds1, ACTIVE) so student1 has a normal-looking card/history.
  await prisma.user.create({
    data: { username: "student1", passwordHash: await hashPassword("demo1234"), role: "STUDENT", studentId: "ds1" },
  })
  await prisma.studentCard.createMany({ data: cards })
  await prisma.payment.createMany({ data: payments.map((p) => ({ ...p, method: "TRANSFER" as const })) })
  await prisma.booking.createMany({ data: bookings.map((b) => ({ ...b, state: "BOOKED" as const })) })
  await prisma.ledgerEntry.createMany({
    data: ledgerEntries.map((l) => ({ ...l, kind: "CONSUME" as const })),
  })
  await prisma.bookingEvent.createMany({
    data: bookingEvents.map((e) => ({ ...e, type: "ADD" as const })),
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
