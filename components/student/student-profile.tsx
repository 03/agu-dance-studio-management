"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrCode, ChevronRight, Bell, Settings, HelpCircle } from "lucide-react"
import { QrPattern } from "@/components/shared/qr-pattern"

export function StudentProfile() {
  const { t } = useLanguage()
  const [qrOpen, setQrOpen] = useState(false)

  const menu = [
    { Icon: Bell, label: t("adm.nav.notifications") },
    { Icon: Settings, label: t("adm.nav.overview") },
    { Icon: HelpCircle, label: t("common.notes") },
  ]

  return (
    <div>
      <header className="bg-primary px-4 pb-8 pt-6 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-primary-foreground/30">
            <AvatarFallback className="bg-primary-foreground/15 font-display text-lg font-bold text-primary-foreground">
              王
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-lg font-bold">王梓涵</p>
            <span className="mt-1 inline-block rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[11px]">
              {t("stu.me.member")} · No.20240612
            </span>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        <button
          onClick={() => setQrOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-accent to-accent/80 p-4 text-left text-accent-foreground shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-foreground/15">
            <QrCode className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="font-display text-base font-bold">{t("stu.qr.show")}</p>
            <p className="text-xs text-accent-foreground/80">{t("stu.qr.desc")}</p>
          </div>
          <ChevronRight className="h-5 w-5 opacity-70" />
        </button>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: t("stu.cards.balance"), value: "25" },
            { label: t("stu.bookings.upcoming"), value: "2" },
            { label: t("tea.attendance"), value: "96%" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center">
              <p className="font-display text-xl font-extrabold text-card-foreground">{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {menu.map(({ Icon, label }, i) => (
            <li key={label}>
              <button className="flex w-full items-center gap-3 border-border px-4 py-3.5 text-left text-sm text-card-foreground [&:not(:last-child)]:border-b">
                <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center font-display">{t("stu.qr.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 pb-2">
            <div className="rounded-3xl bg-card p-5 shadow-inner ring-1 ring-border">
              <QrPattern seed="wangzihan-20240612" />
            </div>
            <div className="text-center">
              <p className="font-display text-base font-bold text-foreground">王梓涵</p>
              <p className="text-xs text-muted-foreground">No.20240612 · {t("stu.me.member")}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">{t("stu.qr.desc")}</p>
            <Button className="w-full" onClick={() => setQrOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
