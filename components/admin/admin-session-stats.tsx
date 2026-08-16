"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { styleColors, type StyleKey } from "@/lib/types"
import { StyleDot } from "@/components/shared/style-dot"
import { getSessionStatsForYear } from "@/lib/actions/analytics"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import type { YearlyStyleStats } from "@/lib/data"

const styleKeys = Object.keys(styleColors) as StyleKey[]

export function AdminSessionStats({ initial }: { initial: YearlyStyleStats }) {
  const { t, lang } = useLanguage()
  const [stats, setStats] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const thisYear = new Date().getFullYear()

  const goTo = (year: number) => {
    if (year < stats.minYear || year > stats.maxYear || isPending) return
    startTransition(async () => {
      const next = await getSessionStatsForYear(year)
      setStats(next)
    })
  }

  const maxMonthTotal = Math.max(1, ...stats.months.map((m) => m.total))
  const yearTotal = stats.months.reduce((sum, m) => sum + m.total, 0)

  const byStyleTotal = new Map<StyleKey, number>()
  for (const m of stats.months) {
    for (const k of styleKeys) {
      const v = m.byStyle[k]
      if (v) byStyleTotal.set(k, (byStyleTotal.get(k) ?? 0) + v)
    }
  }
  const styleRows = styleKeys
    .map((k) => ({ style: k, value: byStyleTotal.get(k) ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
  const totalForPct = Math.max(1, yearTotal)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground">
          {stats.year} {t("adm.sessionStats.total")}:{" "}
          <span className="font-display font-bold text-foreground">{yearTotal}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(stats.year - 1)}
            disabled={isPending || stats.year <= stats.minYear}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-14 text-center font-display text-sm font-bold text-foreground">{stats.year}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(stats.year + 1)}
            disabled={isPending || stats.year >= stats.maxYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {stats.year !== thisYear && (
            <Button variant="outline" size="sm" className="ml-1" onClick={() => goTo(thisYear)} disabled={isPending}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("adm.sessionStats.thisYear")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Monthly stacked bars, segmented by style */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <h2 className="font-display text-base font-bold text-card-foreground">{t("adm.sessionStats.byMonth")}</h2>
          <div className="mt-6 flex h-52 items-end justify-between gap-2">
            {stats.months.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">{m.total || ""}</span>
                <div
                  className="flex w-full flex-col overflow-hidden rounded-t-lg"
                  style={{ height: `${(m.total / maxMonthTotal) * 160}px` }}
                >
                  {styleKeys
                    .filter((k) => m.byStyle[k])
                    .map((k) => (
                      <div
                        key={k}
                        style={{
                          height: `${((m.byStyle[k] ?? 0) / (m.total || 1)) * 100}%`,
                          backgroundColor: styleColors[k],
                        }}
                      />
                    ))}
                </div>
                <span className="text-[11px] text-muted-foreground">{lang === "zh" ? m.month : m.en}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yearly totals by style */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-base font-bold text-card-foreground">{t("adm.chart.byStyle")}</h2>
          {styleRows.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">{t("adm.sessionStats.noData")}</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {styleRows.map((r) => {
                const pct = Math.round((r.value / totalForPct) * 100)
                return (
                  <li key={r.style}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-card-foreground">
                        <StyleDot style={r.style} />
                        {t(r.style)}
                      </span>
                      <span className="text-muted-foreground">
                        {r.value} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: styleColors[r.style] }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
