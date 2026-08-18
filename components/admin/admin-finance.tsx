"use client"

import { useLanguage } from "@/lib/i18n"
import { styleColors } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { StyleDot } from "@/components/shared/style-dot"
import { CashFlowChart } from "./cash-flow-chart"
import type { AdminAppData, YearlyCashFlow } from "@/lib/data"

export function AdminFinance({
  admin,
  teachers,
  cashFlow,
}: {
  admin: AdminAppData["admin"]
  teachers: AdminAppData["teachers"]
  cashFlow: YearlyCashFlow
}) {
  const { t, lang } = useLanguage()
  const { consumptionByStyle, teacherStats } = admin

  const totalConsumption = Math.max(1, consumptionByStyle.reduce((s, c) => s + c.value, 0))
  const maxHeads = Math.max(1, ...teacherStats.map((s) => s.heads))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">{t("adm.nav.finance")}</h2>
      </div>

      {/* Cash flow bar chart */}
      <Card className="p-6">
        <CashFlowChart initial={cashFlow} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Consumption by style */}
        <Card className="p-6">
          <h3 className="mb-5 text-sm font-medium text-muted-foreground">{t("adm.chart.byStyle")}</h3>
          <div className="flex flex-col gap-4">
            {consumptionByStyle.map((c) => {
              const pct = Math.round((c.value / totalConsumption) * 100)
              return (
                <div key={c.style} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <StyleDot style={c.style} />
                      {t(c.style)}
                    </span>
                    <span className="text-muted-foreground">
                      {c.value} {t("unit.classesUnit")} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: styleColors[c.style] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Teacher stats */}
        <Card className="p-6">
          <h3 className="mb-5 text-sm font-medium text-muted-foreground">{t("adm.chart.teacherHeads")}</h3>
          <div className="flex flex-col gap-4">
            {teacherStats.map((s) => {
              const teacher = teachers.find((tt) => tt.id === s.teacherId)!
              return (
                <div key={s.teacherId} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{lang === "zh" ? teacher.name : teacher.nameEn}</span>
                    <span className="text-muted-foreground">
                      {s.heads} {t("unit.people")}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(s.heads / maxHeads) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
