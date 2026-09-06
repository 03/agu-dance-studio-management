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
// `/dev/tcp/host/port`) succeeds fine. This is exactly what produced
// Prisma's "pool timeout... active=0 idle=0" — no connection ever actually
// failed for a real reason, each one just got cut off too early. Disabling
// it process-wide restores the older, more patient behavior: try one
// address at a time, each given the adapter's own connectTimeout/full
// duration rather than this 250ms slice.
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false)
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// mysql-demo branch: swapped from @prisma/adapter-pg to @prisma/adapter-mariadb
// (Prisma's driver adapter for MySQL too, not just MariaDB — its own
// `provider` is literally "mysql", matching schema.prisma's datasource).
// connectionLimit is this driver's equivalent of adapter-pg's `max` — kept
// at the same modest 20 rather than re-deriving a MySQL-specific number,
// since this branch's connection-exhaustion concerns are identical to
// main's (see git history for the pooler incident that number came from).
// connectTimeout: the mariadb driver's own default is a mere 1000ms — fine
// for a local Docker container, too tight for a real remote host with any
// latency (see the autoSelectFamily comment above for the other half of
// this same class of problem).
const adapter = new PrismaMariaDb({
  ...parseConnectionString(process.env.DATABASE_URL),
  connectionLimit: 20,
  connectTimeout: 10_000,
})

// mariadb's PoolConfig doesn't parse a `mysql://` URL itself the way
// pg's connectionString option does — it wants host/user/password/database
// broken out. Small hand-rolled parse rather than a new dependency, since
// this only ever needs to handle the plain `mysql://user:pass@host:port/db`
// shape this app's own .env actually uses. Exported so one-off scripts that
// build their own standalone PrismaClient (outside this module's
// globalThis-cached one) don't need to re-implement it — see
// scripts/batch-create-student-logins.ts.
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

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
