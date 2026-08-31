"use server"

import { prisma } from "@/lib/db"
import { requireRole, verifyPassword, hashPassword } from "@/lib/auth"

// Phone number is plain contact info — editing it here does not touch the
// login username (only lib/actions/users.ts:updateUser, admin-only, does).
// `note` is visible to the student, their teachers, and admin (see
// mapStudent's includeNote option and RosterEntry.note) — not a private
// field, just not broadcast to other students in a bulk list.
export async function updateMyProfile(input: { name: string; phone: string; wechat: string; email: string; note: string }) {
  const session = await requireRole("STUDENT")
  if (!session.studentId) throw new Error("NO_LINKED_STUDENT")

  const name = input.name.trim()
  const phone = input.phone.trim()
  const wechat = input.wechat.trim()
  const email = input.email.trim()
  const note = input.note.trim()

  if (!name) return { error: "auth.register.err.name" }

  await prisma.student.update({
    where: { id: session.studentId },
    data: { name, phone: phone || null, wechat: wechat || null, email: email || null, note: note || null },
  })

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
