"use client"

import { useLanguage } from "@/lib/i18n"
import { CalendarCheck, CreditCard, BarChart3 } from "lucide-react"

// Pitches this as a generic, customizable booking system rather than
// describing the seeded demo studio — only rendered above the login card
// when DEMO_MODE_ENABLED (see app-shell.tsx), since a real studio's own
// deployment wouldn't want ad copy on its own login page.
export function MarketingIntro() {
  const { t } = useLanguage()
  const features = [
    { Icon: CalendarCheck, key: "home.marketing.feature1" },
    { Icon: CreditCard, key: "home.marketing.feature2" },
    { Icon: BarChart3, key: "home.marketing.feature3" },
  ]

  return (
    <div className="max-w-xl text-center">
      <h1 className="text-balance font-display text-xl font-bold text-foreground sm:text-2xl">
        {t("home.marketing.headline")}
      </h1>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {features.map(({ Icon, key }) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon className="h-4 w-4 text-primary" />
            {t(key)}
          </span>
        ))}
      </div>
    </div>
  )
}
