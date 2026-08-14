"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { styleDbToKey, styleLabel } from "@/lib/mappers"
import type { Prisma } from "@/lib/generated/prisma/client"

// Picks which of the student's cards a booking should draw a credit from:
// the non-unlimited, non-expired card with the soonest expiry (use the one
// closest to running out first), falling back to an unlimited card if no
// timed card is available. Returns null if the student has no valid card.
async function pickConsumableCard(tx: Prisma.TransactionClient, studentId: string) {
  const now = new Date()
  const timed = await tx.studentCard.findFirst({
    where: { studentId, isUnlimited: false, balance: { gt: 0 }, expiry: { gt: now } },
    orderBy: { expiry: "asc" },
  })
  if (timed) return timed
  return tx.studentCard.findFirst({ where: { studentId, isUnlimited: true, expiry: { gt: now } } })
}

export async function bookClass(sessionId: string) {
  const { studentId } = await requireRole("STUDENT")
  if (!studentId) throw new Error("NO_LINKED_STUDENT")
  return prisma.$transaction(async (tx) => {
    // Row-lock the session so concurrent bookers of the same session
    // serialize instead of racing past capacity.
    await tx.$executeRaw`SELECT id FROM class_sessions WHERE id = ${sessionId} FOR UPDATE`

    const session = await tx.classSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { teacher: true },
    })
    const bookedCount = await tx.booking.count({ where: { sessionId, state: "BOOKED" } })
    const state = bookedCount < session.capacity ? "BOOKED" : "WAITLIST"

    const booking = await tx.booking.upsert({
      where: { studentId_sessionId: { studentId, sessionId } },
      create: { studentId, sessionId, state },
      update: { state, checkedIn: false, proxy: false },
    })

    if (state === "BOOKED") {
      const card = await pickConsumableCard(tx, studentId)
      if (!card) throw new Error("NO_VALID_CARD")
      if (!card.isUnlimited) {
        await tx.studentCard.update({ where: { id: card.id }, data: { balance: { decrement: 1 } } })
      }
      const label = styleLabel(styleDbToKey(session.style))
      await tx.ledgerEntry.upsert({
        where: { bookingId: booking.id },
        create: {
          studentId,
          cardId: card.id,
          bookingId: booking.id,
          kind: "CONSUME",
          titleZh: `${label.zh} · ${session.teacher.name}`,
          titleEn: `${label.en} · ${session.teacher.nameEn}`,
          date: new Date(),
          delta: -1,
        },
        update: {},
      })
    }

    return booking
  })
}

export async function cancelBooking(sessionId: string) {
  const { studentId } = await requireRole("STUDENT")
  if (!studentId) throw new Error("NO_LINKED_STUDENT")
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM class_sessions WHERE id = ${sessionId} FOR UPDATE`

    const booking = await tx.booking.findUnique({ where: { studentId_sessionId: { studentId, sessionId } } })
    if (!booking || booking.state === "CANCELED") return booking

    if (booking.state === "BOOKED") {
      const ledger = await tx.ledgerEntry.findUnique({ where: { bookingId: booking.id } })
      if (ledger) {
        if (ledger.cardId) {
          const card = await tx.studentCard.findUnique({ where: { id: ledger.cardId } })
          if (card && !card.isUnlimited) {
            await tx.studentCard.update({ where: { id: card.id }, data: { balance: { increment: 1 } } })
          }
        }
        await tx.ledgerEntry.delete({ where: { id: ledger.id } })
      }
    }

    return tx.booking.update({ where: { id: booking.id }, data: { state: "CANCELED" } })
  })
}
