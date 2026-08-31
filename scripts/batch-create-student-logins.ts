// One-off onboarding: creates a login account for every student who doesn't
// already have one, regardless of status (ACTIVE, EXPIRING, or INACTIVE —
// no status filter here on purpose). Username is the student's name
// (trimmed), deduped with a numeric suffix on collision against any
// existing username (any role). All accounts share one initial password and
// are created with mustChangePassword=true, so each student sets their own
// on first login.
// Run via `npx tsx scripts/batch-create-student-logins.ts`.
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"
import { hashPassword } from "../lib/password"

const INITIAL_PASSWORD = "agudance"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const students = await prisma.student.findMany({
    where: { user: null },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  })

  if (students.length === 0) {
    console.log("No students without a login account — nothing to do.")
    return
  }

  const existingUsernames = new Set(
    (await prisma.user.findMany({ select: { username: true } })).map((u) => u.username),
  )

  const passwordHash = await hashPassword(INITIAL_PASSWORD)

  const rows: {
    username: string
    passwordHash: string
    role: "STUDENT"
    mustChangePassword: true
    studentId: string
  }[] = []
  const renamed: { name: string; username: string }[] = []

  for (const s of students) {
    const base = s.name.trim()
    let username = base
    let n = 2
    while (existingUsernames.has(username)) {
      username = `${base}${n}`
      n++
    }
    existingUsernames.add(username)
    if (username !== base) renamed.push({ name: s.name, username })
    rows.push({ username, passwordHash, role: "STUDENT", mustChangePassword: true, studentId: s.id })
  }

  await prisma.user.createMany({ data: rows })

  console.log(`Created ${rows.length} student login accounts. Initial password for all: "${INITIAL_PASSWORD}"`)
  if (renamed.length > 0) {
    console.log(`${renamed.length} username(s) got a numeric suffix due to a name collision:`)
    for (const r of renamed) console.log(`  ${r.name} -> ${r.username}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
