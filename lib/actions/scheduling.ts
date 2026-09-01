"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { styleKeyToDb } from "@/lib/mappers"
import { parseISODate } from "@/lib/schedule-dates"
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
  startDate?: string | null
  endDate?: string | null
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
      startDate: input.startDate ? parseISODate(input.startDate) : null,
      endDate: input.endDate ? parseISODate(input.endDate) : null,
    },
  })
}

export async function updateClassSession(
  id: string,
  input: {
    style: StyleKey
    teacherId: string
    roomId: string
    day: number
    start: string
    end: string
    capacity: number
    levelZh: string
    levelEn: string
    startDate?: string | null
    endDate?: string | null
  },
) {
  await requireRole("ADMIN")
  await prisma.classSession.update({
    where: { id },
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
      ...(input.startDate !== undefined && { startDate: input.startDate ? parseISODate(input.startDate) : null }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? parseISODate(input.endDate) : null }),
    },
  })
}

export async function cancelClassSession(id: string) {
  await requireRole("ADMIN")
  await prisma.classSession.update({ where: { id }, data: { status: "CANCELED" } })
}

// Closures are entered as plain ISO dates picked from a date input — no
// existence check needed beyond what parseISODate already guarantees.
export async function createClassClosure(input: { startDate: string; endDate: string; note: string; sessionId: string | null }) {
  await requireRole("ADMIN")
  const startDate = parseISODate(input.startDate)
  const endDate = parseISODate(input.endDate)
  if (endDate < startDate) throw new Error("INVALID_RANGE")
  await prisma.classClosure.create({
    data: { startDate, endDate, note: input.note.trim() || null, sessionId: input.sessionId },
  })
}

export async function deleteClassClosure(id: string) {
  await requireRole("ADMIN")
  await prisma.classClosure.delete({ where: { id } })
}
