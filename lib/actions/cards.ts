"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { cardTypeToDb } from "@/lib/mappers"
import type { CardType } from "@/lib/types"

export type CardProductInput = {
  type: CardType
  nameZh: string
  nameEn: string
  price: string
  sessions: string
  isUnlimited: boolean
  validityDays: string
}

function normalize(input: CardProductInput) {
  const nameZh = input.nameZh.trim()
  const nameEn = input.nameEn.trim()
  const price = Number.parseInt(input.price, 10)
  const validityDays = Number.parseInt(input.validityDays, 10)
  if (!nameZh) throw new Error("INVALID_NAME")
  if (!nameEn) throw new Error("INVALID_NAME_EN")
  if (!Number.isFinite(price) || price <= 0) throw new Error("INVALID_PRICE")
  if (!Number.isFinite(validityDays) || validityDays <= 0) throw new Error("INVALID_VALIDITY")
  let sessions: number | null = null
  if (!input.isUnlimited) {
    sessions = Number.parseInt(input.sessions, 10)
    if (!Number.isFinite(sessions) || sessions <= 0) throw new Error("INVALID_SESSIONS")
  }
  return {
    type: cardTypeToDb(input.type),
    nameZh,
    nameEn,
    price,
    sessions,
    isUnlimited: input.isUnlimited,
    validityDays,
  }
}

export async function createCardProduct(input: CardProductInput) {
  await requireRole("ADMIN")
  await prisma.cardProduct.create({ data: normalize(input) })
}

export async function updateCardProduct(id: string, input: CardProductInput) {
  await requireRole("ADMIN")
  await prisma.cardProduct.update({ where: { id }, data: normalize(input) })
}

// Blocked once any student has actually been issued a card of this
// product — deleting it would orphan those StudentCard rows.
export async function deleteCardProduct(id: string) {
  await requireRole("ADMIN")
  const issuedCount = await prisma.studentCard.count({ where: { productId: id } })
  if (issuedCount > 0) throw new Error("CARD_PRODUCT_IN_USE")
  await prisma.cardProduct.delete({ where: { id } })
}
