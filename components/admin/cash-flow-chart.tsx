"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { getCashFlowForYear, getCashFlowDetailForMonth } from "@/lib/actions/analytics"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import type { YearlyCashFlow, MonthlyCashFlowDetail } from "@/lib/data"

// Shared by the admin overview dashboard and the finance page — both show
// the same real, year-navigable cash flow (sum of Payment rows per month).
export function CashFlowChart({ initial }: { initial: YearlyCashFlow }) {
  const { t, lang } = useLanguage()
  const [cashFlow, setCashFlow] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const thisYear = new Date().getFullYear()

  // The clicked month's income list — monthIndex is 0-indexed (0=Jan),
  // matching cashFlow.months' own array order, so it doubles as the
  // `month` argument getCashFlowDetailForMonth expects.
  const [detailMonth, setDetailMonth] = useState<{ monthIndex: number; label: string; labelEn: string } | null>(null)
  const [detail, setDetail] = useState<MonthlyCashFlowDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const goToYear = (year: number) => {
    if (year < cashFlow.minYear || year > cashFlow.maxYear || isPending) return
    startTransition(async () => {
      setCashFlow(await getCashFlowForYear(year))
    })
  }

  const openMonth = (monthIndex: number, label: string, labelEn: string) => {
    setDetailMonth({ monthIndex, label, labelEn })
    setDetail(null)
    setDetailLoading(true)
    getCashFlowDetailForMonth(cashFlow.year, monthIndex).then((rows) => {
      setDetail(rows)
      setDetailLoading(false)
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
        {cashFlow.months.map((c, i) => (
          <button
            key={c.month}
            type="button"
            onClick={() => openMonth(i, c.month, c.en)}
            className="flex flex-1 flex-col items-center gap-2 rounded-lg py-1 transition-colors hover:bg-secondary/50"
          >
            <span className="text-[11px] font-medium text-foreground">
              {c.value > 0 ? `${t("unit.currency")}${(c.value / 1000).toFixed(0)}k` : ""}
            </span>
            <div
              className="w-full rounded-t-lg bg-primary transition-all"
              style={{ height: `${(c.value / maxFlow) * 160}px` }}
            />
            <span className="text-[11px] text-muted-foreground">{lang === "zh" ? c.month : c.en}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!detailMonth} onOpenChange={(o) => !o && setDetailMonth(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("adm.chart.cashflow.monthDetail")} · {cashFlow.year} {lang === "zh" ? detailMonth?.label : detailMonth?.labelEn}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}…</p>
          ) : !detail || detail.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("adm.chart.cashflow.monthEmpty")}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto rounded-2xl border border-border">
              {detail.map((c, i) => (
                <li
                  key={c.id}
                  className={`flex items-center justify-between px-4 py-3 ${i !== detail.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">{c.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.cardName ? (lang === "zh" ? c.cardName.zh : c.cardName.en) : "—"} · {t(c.method)} · {c.paidAt}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-base font-bold text-chart-5">
                    +{t("unit.currency")}
                    {c.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
