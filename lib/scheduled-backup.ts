// Runs a full backup cycle (dump + off-site email + audit log — see
// lib/backup.ts's runBackupCycle) once every night at 02:00 Melbourne time,
// for as long as this Node process keeps running. Deliberately not a cron
// library: this only ever needs one fixed daily trigger, so a plain
// check-the-clock-every-minute loop is simpler than pulling in a dependency
// for cron-expression parsing this app will only ever use one line of.
//
// This depends on the server process actually staying up continuously —
// true for a persistent Node process (`next start`, which is how this app
// runs), but NOT true if the host recycles/sleeps an idle process, in which
// case backups would silently stop happening with no error anywhere. If
// that turns out to be the case on whatever host this ends up on, the more
// robust fallback is an external cron hitting a scheduled endpoint instead
// of relying on in-process uptime — ask if that's needed.
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
  checkAndRun() // covers the process starting up already inside the 02:00 hour
  setInterval(checkAndRun, CHECK_INTERVAL_MS)
  console.log("[scheduled-backup] armed — will run daily at 02:00 Australia/Melbourne")
}
