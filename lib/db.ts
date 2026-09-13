import net from "node:net"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "@/lib/generated/prisma/client"

// Node's "Happy Eyeballs" (autoSelectFamily, default true since Node 20)
// races a hostname's IPv4/IPv6 addresses in parallel, giving each only
// autoSelectFamilyAttemptTimeout (default 250ms) before moving to the next
// — fine for nearby/well-connected hosts, but a remote MySQL host with any
// real latency can easily take longer than 250ms just to complete its TCP
// handshake, so every attempt "fails" and the whole connection times out
// even though a plain, non-racing connect (e.g. `mysql -h ...`, or bash's
// `/dev/tcp/host/port`) succeeds fine. Disabling it process-wide restores
// the older, more patient one-address-at-a-time behavior.
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false)
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// mariadb's PoolConfig doesn't parse a `mysql://` URL itself the way
// pg's connectionString option does — it wants host/user/password/database
// broken out. Small hand-rolled parse rather than a new dependency, since
// this only ever needs to handle the plain `mysql://user:pass@host:port/db`
// shape this app's own .env actually uses. Exported so one-off scripts that
// build their own standalone PrismaClient (outside this module's
// globalThis-cached one) don't need to re-implement it — see
// scripts/batch-create-student-logins.ts.
//
// Deliberately synchronous (no DNS pre-resolution to a literal IP here,
// even though that's also a real fix for the autoSelectFamily class of
// problem above) — an async version needs a top-level `await` to use, and
// that breaks any plain `tsx` script that imports this module (including
// `prisma db seed`): Node treats this project as CommonJS by default (no
// "type": "module" in package.json), and esbuild's CJS output — what tsx
// produces outside Next's own always-ESM bundler — doesn't support
// top-level await at all. Next's build/dev never hit this since its
// bundler forces ESM regardless, which is exactly why this shipped once
// before without anyone noticing it broke seeding.
export function parseConnectionString(url: string | undefined) {
  if (!url) throw new Error("DATABASE_URL is not set")
  const u = new URL(url)
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
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
// latency (see the autoSelectFamily comment above for the other half of
// this same class of problem).
const adapter = new PrismaMariaDb({
  ...parseConnectionString(process.env.DATABASE_URL),
  connectionLimit: 5,
  connectTimeout: 10_000,
})

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
