import net from "node:net"
import { lookup } from "node:dns/promises"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { parseConnectionString } from "@/lib/db-connection"

export { parseConnectionString }

// Node's "Happy Eyeballs" (autoSelectFamily, default true since Node 20)
// races a hostname's IPv4/IPv6 addresses in parallel, giving each only
// autoSelectFamilyAttemptTimeout (default 250ms) before moving to the next
// — fine for nearby/well-connected hosts, but a remote MySQL host with any
// real latency can easily take longer than 250ms just to complete its TCP
// handshake, so every attempt "fails" and the whole connection times out
// even though a plain, non-racing connect (e.g. `mysql -h ...`, or bash's
// `/dev/tcp/host/port`) succeeds fine. Kept as defense in depth, but see
// resolveHost below for the fix that doesn't depend on this actually being
// available at all — some hosts (older Node runtimes, e.g. a shared
// hosting Node.js App plan pinned below Node 18.18/19.4) don't even expose
// this API, in which case the guard below silently no-ops and this whole
// mitigation does nothing.
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false)
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Resolves the config's hostname to one literal IPv4 address up front,
// rather than handing mariadb a hostname to resolve (and race IPv4/IPv6
// on) itself — a literal address has nothing left to race, regardless of
// whether the host Node runtime even has autoSelectFamily to disable.
// Falls back to the original host string if lookup itself fails (e.g.
// already a literal IP, or a resolver hiccup) rather than blocking
// startup on it.
//
// This needs a top-level `await` to use, which is why it lives here and
// not in lib/db-connection.ts: this module must only ever be loaded
// through Next's own always-ESM bundler (`next build`/`next start`/`next
// dev`), never through a plain `tsx` script — CJS (what tsx transforms a
// plain script to, since this project has no "type": "module") doesn't
// support top-level await at all. One-off scripts (prisma/seed.ts,
// scripts/batch-create-student-logins.ts) import parseConnectionString
// from lib/db-connection.ts directly for exactly this reason, and build
// their own adapter without going through this file or this function.
async function resolveHost<T extends { host: string }>(config: T): Promise<T> {
  try {
    const { address } = await lookup(config.host, { family: 4 })
    return { ...config, host: address }
  } catch {
    return config
  }
}

// demo-mysql branch: swapped from @prisma/adapter-pg to @prisma/adapter-mariadb
// (Prisma's driver adapter for MySQL too, not just MariaDB — its own
// `provider` is literally "mysql", matching schema.prisma's datasource).
// connectionLimit is kept low (5, down from main's Postgres pool's 20) —
// a shared-hosting MySQL plan can enforce a per-account
// max_connections_per_hour, and every dev-server restart opens a fresh
// batch of pooled connections, so a generous limit here burns through that
// hourly budget fast purely from routine local dev restarts, independent
// of real traffic.
// connectTimeout: the mariadb driver's own default is a mere 1000ms — fine
// for a local Docker container, too tight for a real remote host with any
// latency (see the autoSelectFamily/resolveHost comments above for the
// other half of this same class of problem).
const adapter = new PrismaMariaDb({
  ...(await resolveHost(parseConnectionString(process.env.DATABASE_URL))),
  connectionLimit: 5,
  connectTimeout: 10_000,
})

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
