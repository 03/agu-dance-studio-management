"use client"

import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Period = "morning" | "afternoon" | "evening"

const PERIOD_KEY: Record<Period, string> = {
  morning: "period.morning",
  afternoon: "period.afternoon",
  evening: "period.evening",
}

// Chart tokens double as period colors here (see StyleDot for the same
// reuse pattern with dance styles) — the palette already exists, is
// theme-aware, and lets Tailwind's static scanner see each full class
// name literally instead of one built by string interpolation.
const PERIOD_CLASSES: Record<Period, string> = {
  morning: "bg-chart-2/15 text-chart-2",
  afternoon: "bg-chart-6/15 text-chart-6",
  evening: "bg-chart-1/15 text-chart-1",
}

function periodOf(start: string): Period {
  const hour = Number.parseInt(start.split(":")[0], 10)
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

// A small colored pill next to a class's start time — legible at a glance
// across the schedule's various dense layouts (homepage week/month view,
// admin's weekly editor, student's own list) without reading the raw
// "19:30" string every time. 00:00–11:59 上午, 12:00–17:59 下午,
// 18:00–23:59 晚上.
export function PeriodBadge({ start, className }: { start: string; className?: string }) {
  const { t } = useLanguage()
  const period = periodOf(start)
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none",
        PERIOD_CLASSES[period],
        className,
      )}
    >
      {t(PERIOD_KEY[period])}
    </span>
  )
}
