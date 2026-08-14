"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function buyOrRenewCard(studentId: string, productId: string) {
  await requireRole("ADMIN")
  const product = await prisma.cardProduct.findUniqueOrThrow({ where: { id: productId } })
  const expiry = new Date(Date.now() + product.validityDays * 86_400_000)
  await prisma.$transaction(async (tx) => {
    const card = await tx.studentCard.create({
      data: {
        studentId,
        productId: product.id,
        type: product.type,
        nameZh: product.nameZh,
        nameEn: product.nameEn,
        balance: product.isUnlimited ? null : product.sessions,
        isUnlimited: product.isUnlimited,
        total: product.sessions,
        expiry,
      },
    })
    await tx.payment.create({ data: { studentId, cardId: card.id, amount: product.price, paidAt: new Date() } })
  })
}

// Positive class-count grant onto an existing card, e.g. a birthday gift.
export async function giftClasses(studentId: string, cardId: string, amount: number, reason: string) {
  await requireRole("ADMIN")
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT")
  await prisma.$transaction(async (tx) => {
    const card = await tx.studentCard.findUniqueOrThrow({ where: { id: cardId } })
    if (!card.isUnlimited) {
      await tx.studentCard.update({ where: { id: cardId }, data: { balance: { increment: amount } } })
    }
    await tx.ledgerEntry.create({
      data: {
        studentId,
        cardId,
        kind: "GIFT",
        titleZh: "赠课",
        titleEn: "Gift classes",
        date: new Date(),
        delta: amount,
        noteZh: reason,
        noteEn: reason,
      },
    })
  })
}

// Manual class-count correction on a card; delta may be positive or negative.
export async function adjustBalance(studentId: string, cardId: string, delta: number, reason: string) {
  await requireRole("ADMIN")
  if (!Number.isFinite(delta) || delta === 0) throw new Error("INVALID_DELTA")
  await prisma.$transaction(async (tx) => {
    const card = await tx.studentCard.findUniqueOrThrow({ where: { id: cardId } })
    if (!card.isUnlimited) {
      await tx.studentCard.update({ where: { id: cardId }, data: { balance: { increment: delta } } })
    }
    await tx.ledgerEntry.create({
      data: {
        studentId,
        cardId,
        kind: "ADJUST",
        titleZh: "调整课时",
        titleEn: "Balance adjustment",
        date: new Date(),
        delta,
        noteZh: reason,
        noteEn: reason,
      },
    })
  })
}

// Refund closes the card out: money goes back (negative Payment) and any
// remaining class balance is forfeited (zeroed, logged on the ledger).
export async function refundCard(studentId: string, cardId: string, amount: number, reason: string) {
  await requireRole("ADMIN")
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT")
  await prisma.$transaction(async (tx) => {
    const card = await tx.studentCard.findUniqueOrThrow({ where: { id: cardId } })
    const forfeited = card.isUnlimited ? 0 : (card.balance ?? 0)
    if (!card.isUnlimited) {
      await tx.studentCard.update({ where: { id: cardId }, data: { balance: 0 } })
    }
    await tx.payment.create({ data: { studentId, cardId, amount: -amount, paidAt: new Date() } })
    await tx.ledgerEntry.create({
      data: {
        studentId,
        cardId,
        kind: "REFUND",
        titleZh: "退费",
        titleEn: "Refund",
        date: new Date(),
        delta: -forfeited,
        noteZh: reason,
        noteEn: reason,
      },
    })
  })
}
