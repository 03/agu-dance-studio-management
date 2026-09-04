"use server"

import { prisma } from "@/lib/db"
import { requireRole, hashPassword } from "@/lib/auth"
import { userRoleKeyToDb } from "@/lib/mappers"
import type { Prisma } from "@/lib/generated/prisma/client"
import type { AppUserRole } from "@/lib/types"

export async function getUnlinkedStudentsAndTeachers() {
  await requireRole("ADMIN")
  const [students, teachers] = await Promise.all([
    prisma.student.findMany({ where: { user: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({ where: { user: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])
  return { students, teachers }
}

export type CreateUserInput = {
  username: string
  password: string
  role: AppUserRole
  linkMode: "existing" | "new" | "none"
  existingId?: string
  newName?: string
  newPhone?: string // student only
  newWechat?: string // student only
  newEmail?: string // student only
  newNote?: string // student only
  newNameEn?: string // teacher only
}

// New accounts are always created with mustChangePassword=true — the admin
// picks the initial password, the person actually using it sets their own
// on first login.
export async function createUser(input: CreateUserInput) {
  await requireRole("ADMIN")
  if (input.username.trim().length < 1) throw new Error("INVALID_USERNAME")
  if (input.password.length < 8) throw new Error("INVALID_PASSWORD")

  const data: Prisma.UserCreateInput = {
    username: input.username.trim(),
    passwordHash: await hashPassword(input.password),
    role: userRoleKeyToDb(input.role),
    mustChangePassword: true,
  }

  if (input.role === "student") {
    if (input.linkMode === "existing" && input.existingId) {
      data.student = { connect: { id: input.existingId } }
    } else if (input.linkMode === "new") {
      if (!input.newName?.trim()) throw new Error("MISSING_STUDENT_FIELDS")
      data.student = {
        create: {
          name: input.newName.trim(),
          phone: input.newPhone?.trim() || null,
          wechat: input.newWechat?.trim() || null,
          email: input.newEmail?.trim() || null,
          note: input.newNote?.trim() || null,
          joined: new Date().toISOString().slice(0, 7),
          status: "ACTIVE",
        },
      }
    } else {
      throw new Error("MISSING_LINK")
    }
  } else if (input.role === "teacher") {
    if (input.linkMode === "existing" && input.existingId) {
      data.teacher = { connect: { id: input.existingId } }
    } else if (input.linkMode === "new") {
      if (!input.newName?.trim() || !input.newNameEn?.trim()) throw new Error("MISSING_TEACHER_FIELDS")
      data.teacher = {
        create: { name: input.newName.trim(), nameEn: input.newNameEn.trim(), avatar: "", styles: [] },
      }
    } else {
      throw new Error("MISSING_LINK")
    }
  }

  await prisma.user.create({ data })
}

export async function updateUser(userId: string, username: string) {
  await requireRole("ADMIN")
  if (username.trim().length < 1) throw new Error("INVALID_USERNAME")
  await prisma.user.update({ where: { id: userId }, data: { username: username.trim() } })
}

// Deletes only the login account — the linked Student/Teacher business
// record (bookings, cards, history) is left intact.
export async function deleteUser(userId: string) {
  await requireRole("ADMIN")
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) throw new Error("LAST_ADMIN")
  }
  await prisma.user.delete({ where: { id: userId } })
}

// Forces re-login everywhere by deleting every existing session for this user.
export async function adminResetPassword(userId: string, newPassword: string) {
  await requireRole("ADMIN")
  if (newPassword.length < 8) throw new Error("INVALID_PASSWORD")
  const passwordHash = await hashPassword(newPassword)
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } }),
    prisma.session.deleteMany({ where: { userId } }),
  ])
}
