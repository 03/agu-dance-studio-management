import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/lib/generated/prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// DATABASE_URL must point at Supabase's *transaction* pooler (port 6543,
// `?pgbouncer=true`), not the session pooler (5432) — the session pooler
// reserves one real Postgres backend per client for the whole session, so
// under concurrent traffic (many visitors hitting a page that itself fires
// 10+ parallel queries via Promise.all) it saturates the free-tier's
// 15-connection ceiling almost immediately, which is what caused the 404s/
// 429s under load. The transaction pooler multiplexes many client
// connections onto a handful of real backends (a connection is only held
// for the duration of one transaction), so this pool can run meaningfully
// larger without risking that ceiling — 20 is a deliberately modest step
// up, not a claim that this Node process can't handle more.
// `prisma migrate deploy` still needs the *session* pooler or a direct
// connection (DDL doesn't play well with transaction-mode pooling) — see
// .env's commented-out alternatives, swapped in only for that command.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 20 })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
