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

// Manual class-count correction; delta may be positive or negative (a
// positive delta covers what used to be the separate "gift classes" action
// — that was a strict subset of this one, so it was folded in here rather
// than kept as a second entry point). `cardId` null means a cardless
// correction against the student's overall balance — the normal case for
// legacy-migrated students, whose whole card history lives only in
// ledger_entries (see the legacy migration and computeRemainingBalance's
// cardlessNet handling).
export async function adjustBalance(studentId: string, cardId: string | null, delta: number, reason: string) {
  await requireRole("ADMIN")
  if (!Number.isFinite(delta) || delta === 0) throw new Error("INVALID_DELTA")
  await prisma.$transaction(async (tx) => {
    if (cardId) {
      const card = await tx.studentCard.findUniqueOrThrow({ where: { id: cardId } })
      if (!card.isUnlimited) {
        await tx.studentCard.update({ where: { id: cardId }, data: { balance: { increment: delta } } })
      }
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

// Every editable field on the student business profile except `id`. Phone
// is plain contact info here — it does not affect a linked login account's
// username (see lib/actions/users.ts:updateUser for the only place that
// changes).
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
    note: string
  },
) {
  await requireRole("ADMIN")
  const name = input.name.trim()
  const phone = input.phone.trim()
  const joined = input.joined.trim()
  if (!name) throw new Error("INVALID_NAME")
  if (!joined) throw new Error("INVALID_JOINED")

  await prisma.student.update({
    where: { id },
    data: {
      name,
      phone: phone || null,
      wechat: input.wechat.trim() || null,
      email: input.email.trim() || null,
      code: input.code.trim() || null,
      joined,
      status: studentStatusKeyToDb(input.status),
      note: input.note.trim() || null,
    },
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
