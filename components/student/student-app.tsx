"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { MobileFrame } from "@/components/shared/mobile-frame"
import { StudentSchedule } from "./student-schedule"
import { StudentBookings } from "./student-bookings"
import { StudentCards } from "./student-cards"
import { StudentProfile } from "./student-profile"
import { CalendarDays, Ticket, CreditCard, User, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentAppData } from "@/lib/data"

type Tab = "schedule" | "bookings" | "cards" | "me"

const tabs: { key: Tab; labelKey: string; Icon: typeof CalendarDays }[] = [
  { key: "schedule", labelKey: "stu.nav.schedule", Icon: CalendarDays },
  { key: "bookings", labelKey: "stu.nav.bookings", Icon: Ticket },
  { key: "cards", labelKey: "stu.nav.cards", Icon: CreditCard },
  { key: "me", labelKey: "stu.nav.me", Icon: User },
]

export function StudentApp({
  data,
  onExit,
}: {
  data: StudentAppData
  onExit: () => void | Promise<void>
}) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>("schedule")

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
            <div className="flex-1 overflow-y-auto pb-2">
              {tab === "schedule" && (
                <StudentSchedule
                  sessions={data.sessions}
                  occurrences={data.occurrences}
                  teachers={data.teachers}
                  rooms={data.rooms}
                />
              )}
              {tab === "bookings" && (
                <StudentBookings
                  upcoming={data.student.upcoming}
                  history={data.student.history}
                  teachers={data.teachers}
                  rooms={data.rooms}
                />
              )}
              {tab === "cards" && <StudentCards cards={data.student.cards} ledger={data.student.ledger} />}
              {tab === "me" && (
                <StudentProfile
                  me={data.student.me!}
                  upcomingCount={data.student.upcoming.length}
                  attendanceRate={data.student.attendanceRate}
                />
              )}
            </div>

            <nav className="grid grid-cols-4 border-t border-border bg-card">
              {tabs.map(({ key, labelKey, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                    tab === key ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={tab === key ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" strokeWidth={tab === key ? 2.4 : 1.8} />
                  {t(labelKey)}
                </button>
              ))}
            </nav>
          </div>
        </MobileFrame>
      </div>
    </main>
  )
}
