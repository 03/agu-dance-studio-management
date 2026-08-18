"use server"

import { requireRole } from "@/lib/auth"
import { getYearlyStyleStats, getYearlyCashFlow } from "@/lib/data"

export async function getSessionStatsForYear(year: number) {
  await requireRole("ADMIN")
  return getYearlyStyleStats(year)
}

export async function getCashFlowForYear(year: number) {
  await requireRole("ADMIN")
  return getYearlyCashFlow(year)
}
