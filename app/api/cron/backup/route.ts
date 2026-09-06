import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { runBackupCycle } from "@/lib/backup"
import { studioDateParts, studioInstant, todayISO } from "@/lib/schedule-dates"

// Vercel-Cron-driven equivalent of lib/scheduled-backup.ts's in-process
// timer — that one only works on a host with a persistent, always-running
// Node process (Hostinger's `next start`); Vercel's serverless functions
// don't stay warm, so nothing would ever be sitting there checking the
// clock. This gets hit externally by Vercel Cron instead (see vercel.json).
//
// vercel.json schedules this route TWICE a day, at the UTC times matching
// 02:00 Melbourne under both AEST and AEDT — rather than trying to keep a
// single UTC cron expression in sync with DST twice a year, both fire
// unconditionally and this checks real Melbourne time itself, doing
// nothing on whichever of the two calls isn't actually within the 02:00
// hour right now.
const RUN_HOUR = 2
const SCHEDULED_BY = "system (scheduled)"

export async function GET(request: Request) {
  // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  // CRON_SECRET is optional (unset locally/on Hostinger, where this route
  // is simply never configured to be hit) but should be set on Vercel.
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }
  }

  if (studioDateParts(new Date()).hour !== RUN_HOUR) {
    return NextResponse.json({ ok: true, skipped: "not the scheduled hour in Australia/Melbourne right now" })
  }

  // Durable idempotency check — a fresh serverless invocation has no
  // memory of whichever of today's two cron hits (or a redeploy, or a
  // manual re-trigger) already ran, unlike the in-process version's
  // in-memory `lastRunDateKey`. BackupRecord is the durable equivalent.
  const todayStart = studioInstant(todayISO(), "00:00")
  const alreadyRanToday = await prisma.backupRecord.findFirst({
    where: { createdBy: SCHEDULED_BY, createdAt: { gte: todayStart } },
  })
  if (alreadyRanToday) {
    return NextResponse.json({ ok: true, skipped: "already ran today" })
  }

  const result = await runBackupCycle(SCHEDULED_BY)
  if (!result.ok) {
    return NextResponse.json({ error: "BACKUP_FAILED", message: result.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, filename: result.filename })
}
