// Tools the admin Q&A assistant may call. Deliberately aggregate-only: none
// of these return a student's name, phone, WeChat, email, note or check-in
// code, so even a prompt-injected or misbehaving model has nothing personal
// to leak. (getMonthlyCashFlowDetail is intentionally NOT exposed — it
// lists individual payments with studentName.)
import { prisma } from "@/lib/db"
import {
  getYearlyStyleStats,
  getYearlyCashFlow,
  getMonthlySessionDetail,
  getAdminAnalytics,
  getScheduleSummary,
} from "@/lib/data"
import { styleLabel } from "@/lib/mappers"
import type { StyleKey } from "@/lib/types"
import type { ClaudeTool } from "@/lib/ai/anthropic"

const yearProp = { type: "integer", description: "Calendar year, e.g. 2026" }

export const TOOLS: ClaudeTool[] = [
  {
    name: "get_style_stats",
    description:
      "Consumed class-hours for a calendar year: per month and per dance style, plus per-teacher totals. Use for attendance/popularity/teacher-workload questions.",
    input_schema: { type: "object", properties: { year: yearProp }, required: ["year"] },
  },
  {
    name: "get_cash_flow",
    description: "Income (sum of payments) per month for a calendar year, with the yearly total. Amounts are in AUD.",
    input_schema: { type: "object", properties: { year: yearProp }, required: ["year"] },
  },
  {
    name: "get_month_daily_hours",
    description: "Consumed class-hours for each day of one month.",
    input_schema: {
      type: "object",
      properties: { year: yearProp, month: { type: "integer", description: "Month number 1-12" } },
      required: ["year", "month"],
    },
  },
  {
    name: "get_kpis",
    description:
      "Current headline numbers: this month's revenue (AUD) and consumed class-hours, the number of active students, and the all-time count of checked-in bookings.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_schedule",
    description:
      "The recurring weekly class timetable: style, level, teacher, room, weekday, start/end time, capacity and status.",
    input_schema: { type: "object", properties: {} },
  },
]

function asInt(v: unknown, label: string): number {
  const n = Number(v)
  if (!Number.isInteger(n)) throw new Error(`${label} must be an integer`)
  return n
}

export async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_style_stats": {
      const stats = await getYearlyStyleStats(asInt(input.year, "year"))
      const teachers = await prisma.teacher.findMany({ select: { id: true, name: true } })
      const teacherName = new Map(teachers.map((t) => [t.id, t.name]))
      return {
        year: stats.year,
        months: stats.months.map((m) => ({
          month: m.en,
          totalHours: m.total,
          byStyle: Object.fromEntries(
            Object.entries(m.byStyle).map(([key, hours]) => [styleLabel(key as StyleKey).en, hours]),
          ),
        })),
        teacherHours: stats.teacherStats.map((t) => ({
          teacher: teacherName.get(t.teacherId) ?? "unknown",
          hours: t.heads,
        })),
      }
    }
    case "get_cash_flow": {
      const flow = await getYearlyCashFlow(asInt(input.year, "year"))
      return {
        year: flow.year,
        currency: "AUD",
        total: flow.months.reduce((sum, m) => sum + m.value, 0),
        months: flow.months.map((m) => ({ month: m.en, amount: m.value })),
      }
    }
    case "get_month_daily_hours": {
      const month = asInt(input.month, "month")
      if (month < 1 || month > 12) throw new Error("month must be 1-12")
      const detail = await getMonthlySessionDetail(asInt(input.year, "year"), month - 1)
      return { year: detail.year, month, days: detail.days }
    }
    case "get_kpis": {
      const { kpis } = await getAdminAnalytics()
      return {
        currency: "AUD",
        thisMonthRevenue: kpis.revenue,
        thisMonthConsumedHours: kpis.consumed,
        activeStudents: kpis.activeStudents,
        checkedInBookingsAllTime: kpis.headcount,
      }
    }
    case "get_schedule":
      return getScheduleSummary()
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}
