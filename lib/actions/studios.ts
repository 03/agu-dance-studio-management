"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export type StudioInput = {
  code: string
  name: string
  nameEn: string
  address: string
  postalCode: string
  notes: string
}

function normalize(input: StudioInput) {
  const name = input.name.trim()
  const nameEn = input.nameEn.trim()
  if (!name) throw new Error("INVALID_NAME")
  if (!nameEn) throw new Error("INVALID_NAME_EN")
  return {
    name,
    nameEn,
    code: input.code.trim() || null,
    address: input.address.trim() || null,
    postalCode: input.postalCode.trim() || null,
    notes: input.notes.trim() || null,
  }
}

export async function createStudio(input: StudioInput) {
  await requireRole("ADMIN")
  await prisma.room.create({ data: normalize(input) })
}

export async function updateStudio(id: string, input: StudioInput) {
  await requireRole("ADMIN")
  await prisma.room.update({ where: { id }, data: normalize(input) })
}

// Blocked when the studio still has scheduled classes pointing at it — a
// class session can't be left with a dangling roomId.
export async function deleteStudio(id: string) {
  await requireRole("ADMIN")
  const sessionsCount = await prisma.classSession.count({ where: { roomId: id } })
  if (sessionsCount > 0) throw new Error("STUDIO_IN_USE")
  await prisma.room.delete({ where: { id } })
}
