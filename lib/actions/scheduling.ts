"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { styleKeyToDb } from "@/lib/mappers"
import type { StyleKey } from "@/lib/types"

export async function createClassSession(input: {
  style: StyleKey
  teacherId: string
  roomId: string
  day: number
  start: string
  end: string
  capacity: number
  levelZh: string
  levelEn: string
}) {
  await requireRole("ADMIN")
  await prisma.classSession.create({
    data: {
      style: styleKeyToDb(input.style),
      teacherId: input.teacherId,
      roomId: input.roomId,
      day: input.day,
      start: input.start,
      end: input.end,
      capacity: input.capacity,
      levelZh: input.levelZh,
      levelEn: input.levelEn,
    },
  })
}

export async function updateClassSession(
  id: string,
  input: { teacherId: string; roomId: string; start: string },
) {
  await requireRole("ADMIN")
  await prisma.classSession.update({
    where: { id },
    data: { teacherId: input.teacherId, roomId: input.roomId, start: input.start },
  })
}

export async function cancelClassSession(id: string) {
  await requireRole("ADMIN")
  await prisma.classSession.update({ where: { id }, data: { status: "CANCELED" } })
}
