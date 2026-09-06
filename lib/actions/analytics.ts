"use server"

import { requireRole } from "@/lib/auth"
import { getYearlyStyleStats, getYearlyCashFlow, getMonthlyCashFlowDetail, getMonthlySessionDetail } from "@/lib/data"

export async function getSessionStatsForYear(year: number) {
  await requireRole("ADMIN")
  return getYearlyStyleStats(year)
}

export async function getCashFlowForYear(year: number) {
  await requireRole("ADMIN")
  return getYearlyCashFlow(year)
}

// month is 0-indexed (0=Jan..11=Dec) — see getMonthlyCashFlowDetail's own comment.
export async function getCashFlowDetailForMonth(year: number, month: number) {
  await requireRole("ADMIN")
  return getMonthlyCashFlowDetail(year, month)
}

export async function getSessionStatsDetailForMonth(year: number, month: number) {
  await requireRole("ADMIN")
  return getMonthlySessionDetail(year, month)
}
