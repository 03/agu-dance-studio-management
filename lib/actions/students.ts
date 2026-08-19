"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { studentStatusKeyToDb, paymentMethodToDb } from "@/lib/mappers"
import type { Student, PaymentMethod } from "@/lib/types"

export async function buyOrRenewCard(studentId: string, productId: string, method: PaymentMethod) {
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
    await tx.payment.create({
      data: { studentId, cardId: card.id, amount: product.price, method: paymentMethodToDb(method), paidAt: new Date() },
    })
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

// Every editable field on the student business profile except `id`. Keeps
// a linked login account's username in sync with phone (same invariant the
// self-service profile.ts:updateMyProfile maintains) since phone doubles
// as the username app-wide.
export async function updateStudent(
  id: string,
  input: {
    name: string
    phone: string
    wechat: string
    email: string
    code: string
    joined: string
    status: Student["status"]
  },
) {
  await requireRole("ADMIN")
  const name = input.name.trim()
  const phone = input.phone.trim()
  const joined = input.joined.trim()
  if (!name) throw new Error("INVALID_NAME")
  if (!joined) throw new Error("INVALID_JOINED")

  // Phone is optional business data, but a linked login account's username
  // still has to be non-empty and unique — only sync it to the new phone
  // when one was actually given; clearing phone leaves the username as-is.
  const linkedUser = phone ? await prisma.user.findUnique({ where: { studentId: id } }) : null
  if (linkedUser && linkedUser.username !== phone) {
    const taken = await prisma.user.findUnique({ where: { username: phone } })
    if (taken && taken.id !== linkedUser.id) throw new Error("PHONE_TAKEN")
  }

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        wechat: input.wechat.trim() || null,
        email: input.email.trim() || null,
        code: input.code.trim() || null,
        joined,
        status: studentStatusKeyToDb(input.status),
      },
    })
    if (linkedUser && linkedUser.username !== phone) {
      await tx.user.update({ where: { id: linkedUser.id }, data: { username: phone } })
    }
  })
}

// Only allowed when the student has no booking/card/ledger/payment history
// — deleting those would mean discarding real business records, so this
// rejects with a clear error instead of silently cascading. A linked login
// account (if any) is removed as part of the same deletion since there's no
// profile left for it to sign in as.
export async function deleteStudent(id: string) {
  await requireRole("ADMIN")
  const [bookingsCount, cardsCount, ledgerCount, paymentsCount, linkedUser] = await Promise.all([
    prisma.booking.count({ where: { studentId: id } }),
    prisma.studentCard.count({ where: { studentId: id } }),
    prisma.ledgerEntry.count({ where: { studentId: id } }),
    prisma.payment.count({ where: { studentId: id } }),
    prisma.user.findUnique({ where: { studentId: id } }),
  ])
  if (bookingsCount > 0 || cardsCount > 0 || ledgerCount > 0 || paymentsCount > 0) {
    throw new Error("STUDENT_HAS_HISTORY")
  }
  await prisma.$transaction(async (tx) => {
    if (linkedUser) await tx.user.delete({ where: { id: linkedUser.id } })
    await tx.student.delete({ where: { id } })
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
