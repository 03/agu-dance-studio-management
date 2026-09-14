"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { MobileFrame } from "@/components/shared/mobile-frame"
import { TeacherSchedule } from "./teacher-schedule"
import { RollCall } from "./roll-call"
import { TeacherReviews } from "./teacher-reviews"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronLeft, CalendarDays, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TeacherAppData } from "@/lib/data"

type View = "schedule" | "reviews"

const views: { key: View; labelKey: string; Icon: typeof CalendarDays }[] = [
  { key: "schedule", labelKey: "tea.nav.schedule", Icon: CalendarDays },
  { key: "reviews", labelKey: "tea.nav.reviews", Icon: ScrollText },
]

export function TeacherApp({
  data,
  onExit,
}: {
  data: TeacherAppData
  onExit: () => void | Promise<void>
}) {
  const { t, lang } = useLanguage()
  const [view, setView] = useState<View>("schedule")
  // active roll-call (which session, which real occurrence date), or null
  // when viewing the schedule
  const [rollCall, setRollCall] = useState<{ sessionId: string; date: string } | null>(null)
  const me = data.teacher.me!

  return (
    <main className="min-h-screen bg-secondary/40 py-6">
      <div className="mx-auto max-w-sm px-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="destructive" size="sm" onClick={onExit}>
            <ChevronLeft className="h-4 w-4" />
            {t("app.backHome")}
          </Button>
          <LanguageToggle />
        </div>

        <MobileFrame>
          <div className="flex h-full flex-col bg-background">
            <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary-foreground/30">
                  <AvatarFallback className="bg-primary-foreground/15 font-display font-bold text-primary-foreground">
                    {lang === "zh" ? me.name.charAt(0) : me.nameEn.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-primary-foreground/70">{t("tea.title")}</p>
                  <p className="font-display text-lg font-bold">
                    {lang === "zh" ? me.name : me.nameEn}
                  </p>
                  {me.rating != null && (
                    <p className="text-xs text-primary-foreground/70">
                      {t("coach.ratingBlitz")} {me.rating}
                    </p>
                  )}
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {rollCall ? (
                <RollCall
                  sessionId={rollCall.sessionId}
                  date={rollCall.date}
                  sessions={data.teacher.sessions}
                  rooms={data.rooms}
                  onBack={() => setRollCall(null)}
                />
              ) : view === "schedule" ? (
                <TeacherSchedule
                  sessions={data.teacher.sessions}
                  occurrences={data.occurrences}
                  rooms={data.rooms}
                  onStartRollCall={(sessionId, date) => setRollCall({ sessionId, date })}
                />
              ) : (
                <TeacherReviews reviews={data.gameReviews} />
              )}
            </div>

            {!rollCall && (
              <nav className="grid grid-cols-2 border-t border-border bg-card">
                {views.map(({ key, labelKey, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                      view === key ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-current={view === key ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" strokeWidth={view === key ? 2.4 : 1.8} />
                    {t(labelKey)}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </MobileFrame>
      </div>
    </main>
  )
}
