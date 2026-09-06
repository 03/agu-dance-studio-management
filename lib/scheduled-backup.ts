// Runs a full backup cycle (dump + off-site email + audit log — see
// lib/backup.ts's runBackupCycle) once every night at 02:00 Melbourne time,
// for as long as this Node process keeps running. Deliberately not a cron
// library: this only ever needs one fixed daily trigger, so a plain
// check-the-clock-every-minute loop is simpler than pulling in a dependency
// for cron-expression parsing this app will only ever use one line of.
//
// This depends on the server process actually staying up continuously —
// true for a persistent Node process (`next start`, which is how the demo
// deploy on Hostinger runs), but NOT true on Vercel, whose serverless
// functions don't stay warm between requests — this loop would just never
// get a chance to tick, with no error anywhere to say so. See
// app/api/cron/backup/route.ts + vercel.json for that deploy's actual
// mechanism (Vercel Cron hitting a route instead of relying on in-process
// uptime); startScheduledBackup() below skips itself there rather than
// logging "armed" for a timer that was never going to fire.
import { studioDateParts } from "@/lib/schedule-dates"
import { runBackupCycle } from "@/lib/backup"

const RUN_HOUR = 2 // 02:00–02:59 Melbourne time
const CHECK_INTERVAL_MS = 60_000

let lastRunDateKey: string | null = null
let started = false

function dateKeyFor(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${parts.month}-${parts.day}`
}

async function checkAndRun() {
  const parts = studioDateParts(new Date())
  if (parts.hour !== RUN_HOUR) return
  const key = dateKeyFor(parts)
  if (lastRunDateKey === key) return // already ran during this hour today
  lastRunDateKey = key

  console.log("[scheduled-backup] starting nightly backup")
  try {
    const result = await runBackupCycle("system (scheduled)")
    if (result.ok) {
      console.log(`[scheduled-backup] succeeded: ${result.filename}${result.emailNote ? ` (${result.emailNote})` : ""}`)
    } else {
      console.error(`[scheduled-backup] failed: ${result.message}`)
    }
  } catch (e) {
    // runBackupCycle already catches and logs its own failures as a
    // BackupRecord — this only catches something going wrong outside that
    // (e.g. the DB itself unreachable), so it doesn't crash the process.
    console.error("[scheduled-backup] unexpected error", e)
  }
}

// Idempotent — safe to call more than once (e.g. if instrumentation.ts's
// register() somehow runs twice); only the first call actually starts the
// interval.
export function startScheduledBackup() {
  if (started) return
  started = true
  // Vercel sets this automatically — see the module comment above for why
  // this timer is skipped there rather than armed for nothing.
  if (process.env.VERCEL) {
    console.log("[scheduled-backup] on Vercel — using Cron (app/api/cron/backup) instead, not arming the in-process timer")
    return
  }
  checkAndRun() // covers the process starting up already inside the 02:00 hour
  setInterval(checkAndRun, CHECK_INTERVAL_MS)
  console.log("[scheduled-backup] armed — will run daily at 02:00 Australia/Melbourne")
}
