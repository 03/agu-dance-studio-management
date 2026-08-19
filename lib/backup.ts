// Shells out to the `pg_dump`/`psql` client binaries rather than
// hand-rolling a Prisma-based export/import — a real data-only dump is far
// more robust (handles every column type, escaping, etc. automatically)
// than a custom row serializer, and the tables here are plain columns with
// no BYTEA/large-object data, so a text SQL dump is a fine transport format.
import { spawn } from "node:child_process"
import { readFile, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

// Everything backed up/restored by 备份/还原. Deliberately excludes
// `users`/`sessions` (login accounts survive a restore untouched — see
// restoreBusinessData) and `backup_records` itself (the audit log must
// outlive the operation it's recording).
export const BUSINESS_TABLES = [
  "teachers",
  "rooms",
  "class_sessions",
  "students",
  "bookings",
  "card_products",
  "student_cards",
  "ledger_entries",
  "payments",
] as const

// Children before parents, so each DELETE only ever removes rows whose
// dependents are already gone. Plain DELETE (not TRUNCATE) on purpose:
// TRUNCATE's CASCADE option truncates *entire* referencing tables — it
// would wipe all of `users` since it has FK columns into students/teachers,
// which is exactly what this feature must not do.
const DELETE_ORDER = [
  "ledger_entries",
  "payments",
  "bookings",
  "student_cards",
  "class_sessions",
  "students",
  "card_products",
  "teachers",
  "rooms",
] as const

// Strips Prisma-only query params (e.g. `?schema=public`) that libpq's URI
// parser — used by pg_dump/psql, not Prisma's own connection code — rejects
// outright. Both databases here use the default "public" schema, so
// dropping the query string entirely is safe.
function databaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return url.split("?")[0]
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    let stderr = ""
    child.stderr.on("data", (d) => (stderr += d))
    child.on("error", (err) => reject(new Error(`${cmd}: ${err.message}`)))
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `${cmd} exited with code ${code}`))
    })
  })
}

export function backupFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `agu_backup_${y}_${m}_${d}.sql`
}

// pg_dump's preamble sets a handful of session parameters (statement_timeout,
// transaction_timeout, etc.) gated by the *pg_dump binary's own* version, not
// the server it dumped from — e.g. pg_dump 18 always emits
// `SET transaction_timeout = 0;`, a parameter that doesn't exist before
// Postgres 17, so restoring that dump against a Postgres 16 server (local
// Docker and Supabase both run 16) fails with "unrecognized configuration
// parameter". None of these lines affect the actual data, so just drop them.
function stripVersionSpecificPreamble(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !/^SET [a-z_]+ = .+;$/.test(line) && !line.startsWith("SELECT pg_catalog.set_config("))
    .join("\n")
}

// A data-only dump of the business tables — schema is Prisma-migration
// managed, not part of this file. `--disable-triggers` skips FK trigger
// checks during COPY so pg_dump's chosen table order doesn't matter.
export async function dumpBusinessData(): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `agu-backup-${randomUUID()}.sql`)
  const args = [
    databaseUrl(),
    "--data-only",
    "--disable-triggers",
    "--no-owner",
    "--no-privileges",
    "-f",
    tmpFile,
    ...BUSINESS_TABLES.flatMap((t) => ["-t", t]),
  ]
  try {
    await run("pg_dump", args)
    const content = await readFile(tmpFile, "utf-8")
    return Buffer.from(stripVersionSpecificPreamble(content), "utf-8")
  } finally {
    await unlink(tmpFile).catch(() => {})
  }
}

// Wipes the business tables and reloads them from a prior backup's dump,
// all inside one transaction so a mid-restore failure leaves the database
// exactly as it was. `users` is never deleted, but its studentId/teacherId
// columns FK into students/teachers (ON DELETE SET NULL) — those links are
// saved up front and re-applied afterward wherever the original id still
// exists in the restored data, so login accounts keep working.
export async function restoreBusinessData(dumpContent: string): Promise<void> {
  const tmpFile = join(tmpdir(), `agu-restore-${randomUUID()}.sql`)
  // Defensive: also strip on the way in, in case the uploaded file is an
  // older backup or was produced by a pg_dump build on another machine.
  const cleanDump = stripVersionSpecificPreamble(dumpContent)
  const script = `
BEGIN;

CREATE TEMP TABLE _user_links AS
  SELECT id, "studentId", "teacherId" FROM users WHERE "studentId" IS NOT NULL OR "teacherId" IS NOT NULL;

${DELETE_ORDER.map((t) => `DELETE FROM ${t};`).join("\n")}

${cleanDump}

UPDATE users u SET "studentId" = ul."studentId"
  FROM _user_links ul
  WHERE u.id = ul.id AND ul."studentId" IS NOT NULL
    AND EXISTS (SELECT 1 FROM students s WHERE s.id = ul."studentId");

UPDATE users u SET "teacherId" = ul."teacherId"
  FROM _user_links ul
  WHERE u.id = ul.id AND ul."teacherId" IS NOT NULL
    AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = ul."teacherId");

COMMIT;
`
  await writeFile(tmpFile, script, "utf-8")
  try {
    await run("psql", [databaseUrl(), "-v", "ON_ERROR_STOP=1", "-f", tmpFile])
  } finally {
    await unlink(tmpFile).catch(() => {})
  }
}
