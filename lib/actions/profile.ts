"use server"

import { prisma } from "@/lib/db"
import { requireRole, verifyPassword, hashPassword } from "@/lib/auth"

// Phone number doubles as the login username, so changing it here keeps
// that invariant intact by updating both rows in one transaction.
export async function updateMyProfile(input: { name: string; phone: string; wechat: string; email: string }) {
  const session = await requireRole("STUDENT")
  if (!session.studentId) throw new Error("NO_LINKED_STUDENT")

  const name = input.name.trim()
  const phone = input.phone.trim()
  const wechat = input.wechat.trim()
  const email = input.email.trim()

  if (!name) return { error: "auth.register.err.name" }
  if (!phone) return { error: "auth.register.err.phone" }

  const taken = await prisma.user.findUnique({ where: { username: phone } })
  if (taken && taken.id !== session.userId) return { error: "auth.register.err.phoneTaken" }

  await prisma.$transaction([
    prisma.student.update({
      where: { id: session.studentId },
      data: { name, phone, wechat: wechat || null, email: email || null },
    }),
    prisma.user.update({ where: { id: session.userId }, data: { username: phone } }),
  ])

  return { ok: true as const }
}

// Voluntary self-service password change — distinct from the admin-forced
// reset flow (lib/actions/auth.ts's changePassword), so it requires the
// current password rather than trusting an active session alone.
export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const session = await requireRole("STUDENT")
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } })
  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) return { error: "auth.currentPasswordWrong" }
  if (newPassword.length < 8) return { error: "auth.passwordTooShort" }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } })
  return { ok: true as const }
}
