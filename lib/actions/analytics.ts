"use server"

import { requireRole } from "@/lib/auth"
import { getYearlyStyleStats } from "@/lib/data"

export async function getSessionStatsForYear(year: number) {
  await requireRole("ADMIN")
  return getYearlyStyleStats(year)
}
