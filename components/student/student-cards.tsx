"use client"

import { useLanguage } from "@/lib/i18n"
import { myCards, myLedger } from "@/lib/mock-data"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, Gift, RotateCcw } from "lucide-react"

const cardGradients: Record<string, string> = {
  "stu.card.times": "from-primary to-primary/70",
  "stu.card.period": "from-chart-3 to-primary/60",
  "stu.card.trial": "from-accent to-accent/70",
}

const ledgerMeta: Record<string, { Icon: typeof Gift; color: string }> = {
  "ledger.consume": { Icon: ArrowDownRight, color: "text-muted-foreground" },
  "ledger.recharge": { Icon: ArrowUpRight, color: "text-chart-5" },
  "ledger.gift": { Icon: Gift, color: "text-accent" },
  "ledger.refund": { Icon: RotateCcw, color: "text-destructive" },
}

export function StudentCards() {
  const { t, lang } = useLanguage()

  return (
    <div>
      <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("stu.cards.title")}</h1>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {myCards.map((c) => {
          const pct =
            c.balance === "unlimited" || !c.total
              ? 100
              : Math.round((c.balance / c.total) * 100)
          return (
            <div
              key={c.id}
              className={cn(
                "rounded-2xl bg-gradient-to-br p-4 text-primary-foreground shadow-md",
                cardGradients[c.type],
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-primary-foreground/70">
                    {t(c.type)}
                  </p>
                  <p className="mt-0.5 font-display text-lg font-bold">
                    {lang === "zh" ? c.name.zh : c.name.en}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-extrabold leading-none">
                    {c.balance === "unlimited" ? "∞" : c.balance}
                  </p>
                  <p className="mt-1 text-[10px] text-primary-foreground/70">
                    {c.balance === "unlimited" ? t("stu.cards.unlimited") : t("stu.cards.balance")}
                  </p>
                </div>
              </div>
              {c.balance !== "unlimited" && c.total && (
                <Progress
                  value={pct}
                  className="mt-3 h-1.5 bg-primary-foreground/25 [&>div]:bg-primary-foreground"
                />
              )}
              <p className="mt-3 text-[11px] text-primary-foreground/80">
                {t("stu.cards.expiry")} {c.expiry} · {c.daysLeft} {t("unit.days")}
              </p>
            </div>
          )
        })}
      </div>

      {/* Ledger */}
      <div className="px-4 pb-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">{t("stu.cards.ledger")}</h2>
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {myLedger.map((l, i) => {
            const { Icon, color } = ledgerMeta[l.kind]
            return (
              <li
                key={l.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i !== myLedger.length - 1 && "border-b border-border",
                )}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-secondary", color)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {lang === "zh" ? l.title.zh : l.title.en}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.date}
                    {l.note ? ` · ${lang === "zh" ? l.note.zh : l.note.en}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-display text-sm font-bold",
                    l.delta > 0 ? "text-chart-5" : "text-muted-foreground",
                  )}
                >
                  {l.delta > 0 ? "+" : ""}
                  {l.delta}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
