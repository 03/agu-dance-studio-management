"use client"

import { useLanguage } from "@/lib/i18n"
import {
  adminKpis,
  cashFlow,
  consumptionByStyle,
  styleColors,
} from "@/lib/mock-data"
import { StyleDot } from "@/components/shared/style-dot"
import { TrendingUp, Flame, Users, UserCheck } from "lucide-react"

export function AdminOverview() {
  const { t, lang } = useLanguage()

  const kpis = [
    { key: "adm.kpi.revenue", value: `¥${adminKpis.revenue.toLocaleString()}`, delta: "+12%", Icon: TrendingUp },
    { key: "adm.kpi.consumed", value: adminKpis.consumed.toLocaleString(), delta: "+8%", Icon: Flame },
    { key: "adm.kpi.headcount", value: adminKpis.headcount.toLocaleString(), delta: "+5%", Icon: UserCheck },
    { key: "adm.kpi.activeStudents", value: adminKpis.activeStudents.toLocaleString(), delta: "+3%", Icon: Users },
  ]

  const maxCash = Math.max(...cashFlow.map((c) => c.value))
  const totalConsumption = consumptionByStyle.reduce((a, b) => a + b.value, 0)

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

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Cash flow bar chart */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <h2 className="font-display text-base font-bold text-card-foreground">{t("adm.chart.cashflow")}</h2>
          <div className="mt-6 flex h-52 items-end justify-between gap-3">
            {cashFlow.map((c) => (
              <div key={c.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {Math.round(c.value / 1000)}k
                </span>
                <div
                  className="w-full rounded-t-lg bg-primary transition-all"
                  style={{ height: `${(c.value / maxCash) * 160}px` }}
                />
                <span className="text-[11px] text-muted-foreground">{lang === "zh" ? c.month : c.en}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Consumption by style */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-base font-bold text-card-foreground">{t("adm.chart.byStyle")}</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {consumptionByStyle.map((c) => {
              const pct = Math.round((c.value / totalConsumption) * 100)
              return (
                <li key={c.style}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-card-foreground">
                      <StyleDot style={c.style} />
                      {t(c.style)}
                    </span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: styleColors[c.style] }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
