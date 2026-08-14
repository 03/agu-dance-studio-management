import { cache } from "react"
import { cookies } from "next/headers"
import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/db"
import type { UserRole } from "@/lib/generated/prisma/client"

export { hashPassword, verifyPassword } from "@/lib/password"

const SESSION_COOKIE = "session_token"
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await prisma.session.create({ data: { token, userId, expiresAt } })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export type CurrentSession = {
  userId: string
  username: string
  role: UserRole
  studentId: string | null
  teacherId: string | null
  mustChangePassword: boolean
}

// Cached per request — cookie -> Session -> User join is only actually
// queried once even if called from both app/page.tsx and a Server Action
// invoked during the same render.
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session || session.expiresAt < new Date()) return null

  return {
    userId: session.user.id,
    username: session.user.username,
    role: session.user.role,
    studentId: session.user.studentId,
    teacherId: session.user.teacherId,
    mustChangePassword: session.user.mustChangePassword,
  }
})

export async function destroySession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { token } })
  store.delete(SESSION_COOKIE)
}

export async function requireSession(): Promise<CurrentSession> {
  const session = await getSession()
  if (!session) throw new Error("UNAUTHORIZED")
  return session
}

export async function requireRole(role: UserRole): Promise<CurrentSession> {
  const session = await requireSession()
  if (session.role !== role) throw new Error("FORBIDDEN")
  return session
}

export async function requireAnyRole(roles: UserRole[]): Promise<CurrentSession> {
  const session = await requireSession()
  if (!roles.includes(session.role)) throw new Error("FORBIDDEN")
  return session
}
