// Run via `prisma db seed` (wired through prisma.config.ts -> tsx).
import {PrismaMariaDb} from "@prisma/adapter-mariadb"
import {PrismaClient} from "../lib/generated/prisma/client"
import {parseConnectionString} from "../lib/db-connection"
import {hashPassword} from "../lib/password"
import {styleDbToKey, styleLabel} from "../lib/mappers"

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

  // ---- Login accounts. Admin, plus a teacher login linked to t1. No
  // student login — there's no Student data seeded for one to link to. ----
  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash: await hashPassword("admin1234"), role: "ADMIN" },
      { username: "agu1", passwordHash: await hashPassword("demo1234"), role: "TEACHER", teacherId: "t1" },
    ],
  })

  await seedDemoHistory()

  console.log("Seed complete.")
}

// Purely additive demo history — students, one extra teacher, and past
// bookings/payments — so a freshly seeded install doesn't look like it was
// created five minutes ago. Deliberately never touches the teacher/room/
// class_sessions/card_products/admin+agu1 data seeded above: every id here
// is its own new row, and every booking below is against one of the
// existing class_sessions (c1-c8) rather than inventing a new one.
async function seedDemoHistory() {
  const DEMO_TEACHER = { id: "t2", name: "小美", nameEn: "Mia", avatar: "/placeholder-user.jpg", styles: ["HIPHOP", "LATIN"] as const }
  await prisma.teacher.create({ data: DEMO_TEACHER })
  await prisma.user.create({
    data: { username: "mia1", passwordHash: await hashPassword("demo1234"), role: "TEACHER", teacherId: DEMO_TEACHER.id },
  })

  // Fictional names only — not a real student's name from anywhere this
  // app has ever actually been used with.
  const DEMO_STUDENT_NAMES = [
    "王小美", "Sunny 陈", "李佳怡", "Coco 张", "林晓彤", "Bella 黄", "赵梦琪", "Tiffany 刘",
    "周雨萱", "Kevin 吴", "孙悦", "Amy 徐", "郑思涵", "Leo 马", "何雨欣", "Grace 何",
    "谢佳琪", "Ethan 江", "韩雪儿", "Vivian 潘", "冯梓涵", "Jason 蔡", "曹语彤", "Nancy 邓",
  ]

  const CLASS_SESSIONS = [
    { id: "c1", day: 1 }, { id: "c2", day: 3 }, { id: "c3", day: 5 }, { id: "c4", day: 6 },
    { id: "c5", day: 2 }, { id: "c6", day: 3 }, { id: "c7", day: 4 }, { id: "c8", day: 6 },
  ]
  // 0 = Mon..6 = Sun (this app's day convention) for a plain JS Date.
  const toAppDay = (d: Date) => (d.getDay() + 6) % 7

  // Every date a given weekday actually fell on between [from, to)
  // (exclusive of `to`, so "yesterday" as the upper bound never includes
  // today itself).
  function occurrencesOf(appDay: number, from: Date, to: Date): Date[] {
    const dates: Date[] = []
    const d = new Date(from)
    d.setHours(0, 0, 0, 0)
    while (d < to) {
      if (toAppDay(d) === appDay) dates.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return dates
  }

  const label = styleLabel(styleDbToKey("JAZZ_KPOP")) // every existing session is this style
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const students: { id: string; name: string; phone: string; joined: string; status: "ACTIVE" | "EXPIRING" | "INACTIVE"; note: string | null }[] = []
  const cards: { id: string; studentId: string; productId: string; type: "TIMES"; nameZh: string; nameEn: string; balance: number; total: number; expiry: Date }[] = []
  const payments: { id: string; studentId: string; cardId: string; amount: number; paidAt: Date }[] = []
  const bookings: { id: string; studentId: string; sessionId: string; date: Date; checkedIn: boolean; createdAt: Date }[] = []
  const ledgerEntries: { id: string; studentId: string; cardId: string; bookingId: string; date: Date; delta: number }[] = []

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
      bookings.push({
        id: bookingId,
        studentId: students[students.length - 1].id,
        sessionId: home.id,
        date: occurrenceDate,
        checkedIn: idx % 9 !== 8, // the occasional no-show
        createdAt: occurrenceDate,
      })
      ledgerEntries.push({
        id: `dl${n}-${idx}`,
        studentId: students[students.length - 1].id,
        cardId,
        bookingId,
        date: occurrenceDate,
        delta: -1,
      })
    })
  })

  await prisma.student.createMany({ data: students })
  await prisma.studentCard.createMany({ data: cards })
  await prisma.payment.createMany({ data: payments.map((p) => ({ ...p, method: "TRANSFER" as const })) })
  await prisma.booking.createMany({ data: bookings.map((b) => ({ ...b, state: "BOOKED" as const })) })
  await prisma.ledgerEntry.createMany({
    data: ledgerEntries.map((l) => ({
      ...l,
      kind: "CONSUME" as const,
      titleZh: `${label.zh} · 阿古`,
      titleEn: `${label.en} · Agu`,
    })),
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
