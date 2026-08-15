import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/lib/generated/prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Small, explicit pool cap — Supabase's session pooler reserves one backend
// connection per client, and the free-tier project-wide limit is only 15.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
