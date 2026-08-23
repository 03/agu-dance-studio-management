"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { styleColors, type StyleKey } from "@/lib/types"
import { StyleDot } from "@/components/shared/style-dot"
import { CashFlowChart } from "./cash-flow-chart"
import { Button } from "@/components/ui/button"
import { getSessionStatsForYear } from "@/lib/actions/analytics"
import { TrendingUp, Flame, Users, UserCheck, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import type { AdminAppData, YearlyCashFlow, YearlyStyleStats } from "@/lib/data"

const styleKeys = Object.keys(styleColors) as StyleKey[]

export function AdminOverview({
  admin,
  teachers,
  cashFlow,
  sessionStats,
}: {
  admin: AdminAppData["admin"]
  teachers: AdminAppData["teachers"]
  cashFlow: YearlyCashFlow
  sessionStats: YearlyStyleStats
}) {
  const { t } = useLanguage()
  const { kpis: adminKpis } = admin

  const kpis = [
    { key: "adm.kpi.revenue", value: `$${adminKpis.revenue.toLocaleString()}`, delta: "+12%", Icon: TrendingUp },
    { key: "adm.kpi.consumed", value: adminKpis.consumed.toLocaleString(), delta: "+8%", Icon: Flame },
    { key: "adm.kpi.headcount", value: adminKpis.headcount.toLocaleString(), delta: "+5%", Icon: UserCheck },
    { key: "adm.kpi.activeStudents", value: adminKpis.activeStudents.toLocaleString(), delta: "+3%", Icon: Users },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ key, value, delta, Icon }) => (
          <div key={key} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="rounded-full bg-chart-5/10 px-2 py-0.5 text-[11px] font-semibold text-chart-5">
                {delta}
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-extrabold text-card-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(key)}</p>
          </div>
        ))}
      </div>

      {/* Cash flow bar chart */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <CashFlowChart initial={cashFlow} />
      </div>

      <SessionStatsSection initial={sessionStats} teachers={teachers} />
    </div>
  )
}

function SessionStatsSection({
  initial,
  teachers,
}: {
  initial: YearlyStyleStats
  teachers: AdminAppData["teachers"]
}) {
  const { t, lang } = useLanguage()
  const [stats, setStats] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const thisYear = new Date().getFullYear()
  const maxHeads = Math.max(1, ...stats.teacherStats.map((s) => s.heads))

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
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-base font-bold text-card-foreground">{t("adm.sessionStats.byMonth")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("adm.chart.cashflow.yearTotal")}:{" "}
            <span className="font-display font-bold text-foreground">{yearTotal}</span>
          </span>
        </div>

        <div className="flex flex-col items-end gap-3">
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

          {/* Yearly totals by style */}
          <div className="w-52">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t("adm.chart.byStyle")}</p>
            {styleRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("adm.sessionStats.noData")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {styleRows.map((r) => {
                  const pct = Math.round((r.value / totalForPct) * 100)
                  return (
                    <li key={r.style}>
                      <div className="mb-0.5 flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-medium text-card-foreground">
                          <StyleDot style={r.style} />
                          {t(r.style)}
                        </span>
                        <span className="text-muted-foreground">
                          {r.value} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
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

          {/* Teacher attendance */}
          <div className="w-52">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t("adm.chart.teacherHeads")}</p>
            {stats.teacherStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("adm.sessionStats.noData")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {stats.teacherStats.map((s) => {
                  const teacher = teachers.find((tt) => tt.id === s.teacherId)!
                  return (
                    <li key={s.teacherId}>
                      <div className="mb-0.5 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-card-foreground">
                          {lang === "zh" ? teacher.name : teacher.nameEn}
                        </span>
                        <span className="text-muted-foreground">
                          {s.heads} {t("unit.people")}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${(s.heads / maxHeads) * 100}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-52 items-end justify-between gap-2">
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
  )
}
