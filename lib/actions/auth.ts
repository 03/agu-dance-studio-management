"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { hashPassword, verifyPassword, createSession, destroySession, requireSession } from "@/lib/auth"
import { REGISTRATION_ENABLED } from "@/lib/feature-flags"
import type { UserRole } from "@/lib/generated/prisma/client"

// Deliberately returns the same generic error for "no such user", "wrong
// role for the card clicked", and "wrong password" — never reveals which
// case it was, so a username's role can't be enumerated by trying each
// role card. `redirect()` must stay outside any try/catch: it works by
// throwing internally, and a catch-all here would swallow it.
export async function login(username: string, password: string, expectedRole: UserRole) {
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || user.role !== expectedRole) {
    return { error: "auth.invalidCredentials" }
  }
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return { error: "auth.invalidCredentials" }
  }
  await createSession(user.id)
  redirect("/")
}

// Self-service student registration. Phone number doubles as the login
// username (no separate username field was asked for) — must be unique
// across accounts, checked up front for a friendly error instead of
// surfacing a raw unique-constraint violation. Auto-logs the new account in.
export async function register(input: {
  name: string
  phone: string
  wechat: string
  email: string
  password: string
}) {
  // Belt-and-suspenders with app-shell.tsx hiding the entry point — refuses
  // even a direct call to this action while sign-ups are paused, not just
  // the button that normally leads here.
  if (!REGISTRATION_ENABLED) return { error: "auth.register.err.disabled" }

  const name = input.name.trim()
  const phone = input.phone.trim()
  const wechat = input.wechat.trim()
  const email = input.email.trim()

  if (!name) return { error: "auth.register.err.name" }
  if (!phone) return { error: "auth.register.err.phone" }
  if (input.password.length < 8) return { error: "auth.passwordTooShort" }

  const existing = await prisma.user.findUnique({ where: { username: phone } })
  if (existing) return { error: "auth.register.err.phoneTaken" }

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      username: phone,
      passwordHash,
      role: "STUDENT",
      student: {
        create: {
          name,
          phone,
          wechat: wechat || null,
          email: email || null,
          joined: new Date().toISOString().slice(0, 7),
          status: "ACTIVE",
        },
      },
    },
    select: { id: true },
  })

  await createSession(user.id)
  redirect("/")
}

export async function logout() {
  await destroySession()
  redirect("/")
}

export async function changePassword(newPassword: string) {
  const session = await requireSession()
  if (newPassword.length < 8) {
    return { error: "auth.passwordTooShort" }
  }
  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash, mustChangePassword: false },
  })
  return { ok: true as const }
}
