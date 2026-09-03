// Pure Prisma/JS backup+restore — no external `pg_dump`/`psql` binaries.
// The previous implementation shelled out to those CLI tools, which is fine
// locally or on a VPS, but fails outright (`spawn pg_dump ENOENT`) on
// managed hosting like Hostinger's Node.js App plans, which give no way to
// install system packages. This version reads/writes every row through the
// same Prisma connection the rest of the app already uses, so it works
// anywhere the app itself runs. Trade-off: backups are now a JSON snapshot
// of Prisma's own row shapes rather than a portable SQL dump — fine for
// this feature's actual use (restore into this same schema), but old
// `.sql` backup files from the previous implementation can no longer be
// restored.
import { prisma } from "@/lib/db"
import { sendBackupEmail } from "@/lib/email"
import type { Prisma } from "@/lib/generated/prisma/client"

// Parents before children — the order both the dump's keys and the
// restore's re-inserts use. Rows are re-created with their original ids
// (not through relation connects), so a row's FK targets must already
// exist by the time it's inserted. `user` is last since it can FK into
// both student and teacher; `session` is deliberately not here at all —
// see restoreBusinessData for why sessions are handled separately.
const RESTORE_ORDER = [
  "teacher",
  "room",
  "classSession",
  "classClosure",
  "student",
  "cardProduct",
  "booking",
  "studentCard",
  "ledgerEntry",
  "payment",
  "user",
] as const

type ModelName = (typeof RESTORE_ORDER)[number]

// Children before parents, so each deleteMany only ever removes rows whose
// dependents are already gone.
const DELETE_ORDER = [...RESTORE_ORDER].reverse() as ModelName[]

// DateTime fields per model — JSON has no native date type, so these need
// re-hydrating from ISO strings back into Date objects before insert.
const DATE_FIELDS: Partial<Record<ModelName, string[]>> = {
  booking: ["date", "createdAt"],
  classClosure: ["startDate", "endDate"],
  studentCard: ["expiry"],
  ledgerEntry: ["date"],
  payment: ["paidAt"],
  user: ["createdAt"],
}

type Row = Record<string, unknown>
type Delegate = {
  findMany: () => Promise<Row[]>
  deleteMany: () => Promise<unknown>
  createMany: (args: { data: Row[] }) => Promise<unknown>
}

// The real Prisma delegates each want their own specific per-model input
// type, not this generic Row shape — this utility is intentionally generic
// across all ten business tables, so the cast trades that per-model
// checking away in exchange for not hand-writing this loop ten times.
function delegates(client: Prisma.TransactionClient | typeof prisma): Record<ModelName, Delegate> {
  return {
    teacher: client.teacher,
    room: client.room,
    classSession: client.classSession,
    classClosure: client.classClosure,
    student: client.student,
    cardProduct: client.cardProduct,
    booking: client.booking,
    studentCard: client.studentCard,
    ledgerEntry: client.ledgerEntry,
    payment: client.payment,
    user: client.user,
  } as unknown as Record<ModelName, Delegate>
}

const BACKUP_FORMAT_VERSION = 1

export function backupFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `agu_backup_${y}_${m}_${d}.json`
}

export async function dumpBusinessData(): Promise<Buffer> {
  const d = delegates(prisma)
  const data: Partial<Record<ModelName, Row[]>> = {}
  for (const model of RESTORE_ORDER) {
    data[model] = await d[model].findMany()
  }
  const payload = { version: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(), data }
  return Buffer.from(JSON.stringify(payload), "utf-8")
}

export type BackupCycleResult =
  | { ok: true; filename: string; content: Buffer; emailNote: string | null }
  | { ok: false; filename: string; message: string }

// One full backup cycle — dump, best-effort off-site email, audit log —
// shared by the admin's manual download button (app/api/admin/backup) and
// the nightly scheduled run (lib/scheduled-backup.ts), so both go through
// identical logic instead of two copies drifting apart. `createdBy` is
// whatever should show in the 备份/还原 audit table's 操作人 column —
// an admin's username for a manual click, or a fixed label like
// "system (scheduled)" for the automated run.
export async function runBackupCycle(createdBy: string): Promise<BackupCycleResult> {
  const filename = backupFilename()
  try {
    const content = await dumpBusinessData()

    // The off-site email copy is a bonus on top of the backup itself — a
    // failed send must not fail the backup, just get noted on the record.
    let emailNote: string | null = null
    try {
      await sendBackupEmail(content, filename)
    } catch (emailErr) {
      emailNote = `Email copy failed: ${emailErr instanceof Error ? emailErr.message : "unknown error"}`.slice(0, 500)
    }

    await prisma.backupRecord.create({
      data: { action: "BACKUP", filename, status: "SUCCESS", message: emailNote, createdBy },
    })
    return { ok: true, filename, content, emailNote }
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : "unknown error"
    await prisma.backupRecord.create({
      data: { action: "BACKUP", filename, status: "FAILED", message, createdBy },
    })
    return { ok: false, filename, message }
  }
}

// Wipes every table this feature covers — including login accounts — and
// reloads them from a prior backup's dump, all inside one transaction so a
// mid-restore failure leaves the database exactly as it was. Rows keep
// their original ids, so a `user` row's studentId/teacherId already points
// at the right restored student/teacher without any extra relinking step.
// `sessions` are cleared explicitly rather than left to the `user` deleteMany's
// ON DELETE CASCADE — restoring is exactly the moment every active login
// should be forced to re-authenticate, and that shouldn't depend on a FK
// behavior someone could quietly change later.
export async function restoreBusinessData(dumpContent: string): Promise<void> {
  let parsed: { data?: Partial<Record<ModelName, Row[]>> }
  try {
    parsed = JSON.parse(dumpContent)
  } catch {
    throw new Error("INVALID_BACKUP_FILE: not valid JSON")
  }
  const data = parsed.data
  if (!data || typeof data !== "object") {
    throw new Error("INVALID_BACKUP_FILE: missing data")
  }

  await prisma.$transaction(
    async (tx) => {
      const d = delegates(tx)

      await tx.session.deleteMany()

      for (const model of DELETE_ORDER) {
        await d[model].deleteMany()
      }

      for (const model of RESTORE_ORDER) {
        const rows = data[model] ?? []
        if (rows.length === 0) continue
        const dateFields = DATE_FIELDS[model] ?? []
        const hydrated =
          dateFields.length === 0
            ? rows
            : rows.map((row) => {
                const copy = { ...row }
                for (const field of dateFields) {
                  if (copy[field] != null) copy[field] = new Date(copy[field] as string)
                }
                return copy
              })
        await d[model].createMany({ data: hydrated })
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )
}
