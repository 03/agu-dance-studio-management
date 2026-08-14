"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { toggleNotificationRule } from "@/lib/actions/notifications"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { AdminAppData } from "@/lib/data"

export function AdminNotifications({
  notificationRules: rules,
}: {
  notificationRules: AdminAppData["notificationRules"]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const toggle = (id: string) => {
    startTransition(async () => {
      await toggleNotificationRule(id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">{t("adm.notif.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("adm.nav.notifications")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="flex items-center justify-between gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{t(rule.key)}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {lang === "zh" ? rule.channel.zh : rule.channel.en}
                </span>
              </div>
              <p className="max-w-2xl rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                {lang === "zh" ? rule.sample.zh : rule.sample.en}
              </p>
            </div>
            <Switch
              checked={rule.enabled}
              disabled={isPending}
              onCheckedChange={() => toggle(rule.id)}
              aria-label={t(rule.key)}
            />
          </Card>
        ))}
      </div>
    </div>
  )
}
