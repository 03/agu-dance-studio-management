import net from "node:net"
import { lookup } from "node:dns/promises"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "@/lib/generated/prisma/client"

// Node's "Happy Eyeballs" (autoSelectFamily, default true since Node 20)
// races a hostname's IPv4/IPv6 addresses in parallel, giving each only
// autoSelectFamilyAttemptTimeout (default 250ms) before moving to the next
// — fine for nearby/well-connected hosts, but a remote MySQL host with any
// real latency can easily take longer than 250ms just to complete its TCP
// handshake, so every attempt "fails" and the whole connection times out
// even though a plain, non-racing connect (e.g. `mysql -h ...`, or bash's
// `/dev/tcp/host/port`) succeeds fine. Kept as defense in depth, but see
// resolveHost below for the fix that doesn't depend on this actually
// taking effect in whatever process/worker ends up opening the socket —
// it didn't reliably (still failed under `next dev` after this alone).
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

// Resolves the config's hostname to one literal IPv4 address up front,
// rather than handing mariadb a hostname to resolve (and race IPv4/IPv6
// on) itself — confirmed via logging that `next dev` still hit the same
// failure with autoSelectFamily disabled above (lib/db.ts's module runs
// twice per `next dev` start — main process + a separate render worker —
// and something about that environment didn't reliably honor the global
// net setting). A literal address has nothing left to race: there's only
// one candidate. Falls back to the original host string if lookup itself
// fails (e.g. already a literal IP, or a resolver hiccup) rather than
// blocking startup on it.
async function resolveHost<T extends { host: string }>(config: T): Promise<T> {
  try {
    const { address } = await lookup(config.host, { family: 4 })
    return { ...config, host: address }
  } catch {
    return config
  }
}

// mysql-demo branch: swapped from @prisma/adapter-pg to @prisma/adapter-mariadb
// (Prisma's driver adapter for MySQL too, not just MariaDB — its own
// `provider` is literally "mysql", matching schema.prisma's datasource).
// connectionLimit is kept low (5, down from main's Postgres pool's 20) —
// Hostinger's shared MySQL plans enforce a per-account
// max_connections_per_hour (this one's currently 500/hour), and every
// dev-server restart opens a fresh batch of pooled connections — twice
// over, per the resolveHost comment above — so a generous limit here
// burns through that hourly budget fast purely from routine local dev
// restarts, independent of real traffic.
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
