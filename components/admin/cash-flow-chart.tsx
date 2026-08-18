"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { getCashFlowForYear } from "@/lib/actions/analytics"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import type { YearlyCashFlow } from "@/lib/data"

// Shared by the admin overview dashboard and the finance page — both show
// the same real, year-navigable cash flow (sum of Payment rows per month).
export function CashFlowChart({ initial }: { initial: YearlyCashFlow }) {
  const { t, lang } = useLanguage()
  const [cashFlow, setCashFlow] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const thisYear = new Date().getFullYear()

  const goToYear = (year: number) => {
    if (year < cashFlow.minYear || year > cashFlow.maxYear || isPending) return
    startTransition(async () => {
      setCashFlow(await getCashFlowForYear(year))
    })
  }

  const maxFlow = Math.max(1, ...cashFlow.months.map((c) => c.value))
  const yearTotal = cashFlow.months.reduce((sum, c) => sum + c.value, 0)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-base font-bold text-card-foreground">{t("adm.chart.cashflow")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("adm.chart.cashflow.yearTotal")}:{" "}
            <span className="font-display font-bold text-foreground">
              {t("unit.currency")}
              {yearTotal.toLocaleString()}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToYear(cashFlow.year - 1)}
            disabled={isPending || cashFlow.year <= cashFlow.minYear}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-14 text-center font-display text-sm font-bold text-foreground">{cashFlow.year}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToYear(cashFlow.year + 1)}
            disabled={isPending || cashFlow.year >= cashFlow.maxYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {cashFlow.year !== thisYear && (
            <Button variant="outline" size="sm" className="ml-1" onClick={() => goToYear(thisYear)} disabled={isPending}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("adm.sessionStats.thisYear")}
            </Button>
          )}
        </div>
      </div>
      <div className="flex h-52 items-end justify-between gap-2">
        {cashFlow.months.map((c) => (
          <div key={c.month} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[11px] font-medium text-foreground">
              {c.value > 0 ? `${t("unit.currency")}${(c.value / 1000).toFixed(0)}k` : ""}
            </span>
            <div
              className="w-full rounded-t-lg bg-primary transition-all"
              style={{ height: `${(c.value / maxFlow) * 160}px` }}
            />
            <span className="text-[11px] text-muted-foreground">{lang === "zh" ? c.month : c.en}</span>
          </div>
        ))}
      </div>
    </>
  )
}
