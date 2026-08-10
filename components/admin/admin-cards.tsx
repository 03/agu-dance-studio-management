"use client"

import { useLanguage } from "@/lib/i18n"
import { cardProducts } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Plus, Ticket, Infinity as InfinityIcon, Sparkles } from "lucide-react"

const typeIcon = {
  "stu.card.times": Ticket,
  "stu.card.period": InfinityIcon,
  "stu.card.trial": Sparkles,
}

export function AdminCards() {
  const { t, lang } = useLanguage()

  // recent cashier transactions
  const cashier = [
    { id: "cx1", student: "王梓涵", product: { zh: "48 次通卡", en: "48-class pack" }, amount: 5760, time: "12.08 14:20" },
    { id: "cx2", student: "孙悦", product: { zh: "12 次卡", en: "12-class card" }, amount: 1680, time: "12.08 11:05" },
    { id: "cx3", student: "李思远", product: { zh: "新人体验卡", en: "Trial card" }, amount: 99, time: "12.07 19:40" },
    { id: "cx4", student: "刘一诺", product: { zh: "季度不限卡", en: "Quarterly unlimited" }, amount: 3980, time: "12.07 10:12" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">{t("adm.cards.sold")}</h2>
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {t("adm.schedule.add")}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cardProducts.map((p) => {
            const Icon = typeIcon[p.type]
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-display text-base font-bold text-card-foreground">
                  {lang === "zh" ? p.name.zh : p.name.en}
                </p>
                <p className="text-xs text-muted-foreground">{t(p.type)}</p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="font-display text-2xl font-extrabold text-primary">¥{p.price.toLocaleString()}</p>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>
                      {p.sessions === "unlimited" ? t("stu.cards.unlimited") : `${p.sessions} ${t("adm.cards.sessions")}`}
                    </p>
                    <p>
                      {p.validityDays} {t("unit.days")}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-base font-bold text-foreground">{t("adm.nav.cards")}</h2>
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {cashier.map((c, i) => (
            <li
              key={c.id}
              className={`flex items-center justify-between px-5 py-3.5 ${i !== cashier.length - 1 ? "border-b border-border" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-card-foreground">{c.student}</p>
                <p className="text-xs text-muted-foreground">
                  {lang === "zh" ? c.product.zh : c.product.en} · {c.time}
                </p>
              </div>
              <span className="font-display text-base font-bold text-chart-5">+¥{c.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
