import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "@/lib/generated/prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// mysql-demo branch: swapped from @prisma/adapter-pg to @prisma/adapter-mariadb
// (Prisma's driver adapter for MySQL too, not just MariaDB — its own
// `provider` is literally "mysql", matching schema.prisma's datasource).
// connectionLimit is this driver's equivalent of adapter-pg's `max` — kept
// at the same modest 20 rather than re-deriving a MySQL-specific number,
// since this branch's connection-exhaustion concerns are identical to
// main's (see git history for the pooler incident that number came from).
const adapter = new PrismaMariaDb({
  ...parseConnectionString(process.env.DATABASE_URL),
  connectionLimit: 20,
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
