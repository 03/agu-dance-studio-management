"use server"

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function toggleNotificationRule(id: string) {
  await requireRole("ADMIN")
  const rule = await prisma.notificationRule.findUniqueOrThrow({ where: { id } })
  await prisma.notificationRule.update({ where: { id }, data: { enabled: !rule.enabled } })
}
