// Next.js's official one-time startup hook — register() runs exactly once
// when the server process boots, which is exactly what the nightly backup
// scheduler needs (see lib/scheduled-backup.ts for why this isn't a cron
// library). The NEXT_RUNTIME guard is the standard way to keep Node-only
// code (Prisma, node:crypto in lib/password.ts, etc.) out of the separate
// Edge runtime, which also calls register() but can't run any of this.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduledBackup } = await import("@/lib/scheduled-backup")
    startScheduledBackup()
  }
}
