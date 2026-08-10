"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { sessions, roster as initialRoster, rooms } from "@/lib/mock-data"
import { StyleDot } from "@/components/shared/style-dot"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronLeft, Check, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function RollCall({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { t, lang } = useLanguage()
  const session = sessions.find((s) => s.id === sessionId)!
  const [roster, setRoster] = useState(initialRoster.map((r) => ({ ...r })))

  const checkedIn = roster.filter((r) => r.checkedIn).length
  const roomName = lang === "zh" ? rooms.find((x) => x.id === session.roomId)?.name : rooms.find((x) => x.id === session.roomId)?.nameEn

  const check = (id: string, proxy = false) =>
    setRoster((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checkedIn: !r.checkedIn, proxy: !r.checkedIn ? proxy : false } : r)),
    )

  return (
    <div>
      <div className="border-b border-border bg-card px-4 py-3">
        <button
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("tea.mySchedule")}
        </button>
        <div className="flex items-center gap-2">
          <StyleDot style={session.style} />
          <span className="font-display text-lg font-bold text-card-foreground">{t(session.style)}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {session.date} · {session.start}–{session.end} · {roomName}
        </p>
      </div>

      {/* Attendance summary */}
      <div className="flex items-center justify-between bg-primary/5 px-4 py-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold text-primary">{checkedIn}</span>
          <span className="text-sm text-muted-foreground">/ {roster.length} {t("tea.checkedIn")}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round((checkedIn / roster.length) * 100)}% {t("tea.attendance")}
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {roster.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar className="h-9 w-9">
              <AvatarFallback
                className={cn(
                  "text-sm font-semibold",
                  r.checkedIn ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                )}
              >
                {r.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {r.checkedIn ? (r.proxy ? t("tea.proxyCheckIn") : t("tea.checkedIn")) : t("tea.notCheckedIn")}
              </p>
            </div>
            {r.checkedIn ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </span>
            ) : (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => check(r.id, true)}>
                  <UserCheck className="mr-1 h-3.5 w-3.5" />
                  {t("tea.proxyCheckIn")}
                </Button>
                <Button size="sm" className="h-8 px-3 text-xs" onClick={() => check(r.id)}>
                  {t("tea.checkIn")}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 border-t border-border bg-card p-4">
        <Button className="w-full" onClick={onBack}>
          {t("tea.finishClass")} · {checkedIn}/{roster.length}
        </Button>
      </div>
    </div>
  )
}
