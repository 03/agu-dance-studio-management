// Pure Node crypto password hashing — deliberately has no dependency on
// Next.js (no "next/headers", no "use server"), so it can be imported from
// both lib/auth.ts (the app runtime) and prisma/seed.ts (a standalone tsx
// script outside the Next request context).
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)

// passwordHash format is "salt:hash" (both hex) — not a bcrypt/argon2 string.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derived.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":")
  if (!salt || !hashHex) return false
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  const storedBuf = Buffer.from(hashHex, "hex")
  return derived.length === storedBuf.length && timingSafeEqual(derived, storedBuf)
}
