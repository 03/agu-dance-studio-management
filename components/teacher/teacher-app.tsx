"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { MobileFrame } from "@/components/shared/mobile-frame"
import { TeacherSchedule } from "./teacher-schedule"
import { RollCall } from "./roll-call"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { teachers } from "@/lib/mock-data"
import { ChevronLeft } from "lucide-react"

export function TeacherApp({ onExit }: { onExit: () => void }) {
  const { t, lang } = useLanguage()
  // active roll-call session id, or null when viewing schedule
  const [rollCallId, setRollCallId] = useState<string | null>(null)
  const me = teachers[0]

  return (
    <main className="min-h-screen bg-secondary/40 py-6">
      <div className="mx-auto max-w-sm px-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("app.backHome")}
          </button>
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
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {rollCallId ? (
                <RollCall sessionId={rollCallId} onBack={() => setRollCallId(null)} />
              ) : (
                <TeacherSchedule onStartRollCall={setRollCallId} />
              )}
            </div>
          </div>
        </MobileFrame>
      </div>
    </main>
  )
}
