// Seeds the dev database with just the reference data the app needs to run
// (teachers, rooms, the recurring class schedule, card products) and login
// accounts for admin/teacher — no student data or booking history, so the
// admin analytics start from an empty, real state rather than backfilled
// synthetic activity.
//
// Run via `prisma db seed` (wired through prisma.config.ts -> tsx).
import {PrismaPg} from "@prisma/adapter-pg"
import {PrismaClient} from "../lib/generated/prisma/client"
import {hashPassword} from "../lib/password"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
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
