"use client"

import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, type ClassSession, type Occurrence, type Room } from "@/lib/types"
import { nextOccurrence, formatAppDate, toISODate, occurrenceKey } from "@/lib/schedule-dates"
import { StyleDot } from "@/components/shared/style-dot"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Users, ClipboardCheck } from "lucide-react"

export function TeacherSchedule({
  sessions: myClasses,
  occurrences,
  rooms,
  onStartRollCall,
}: {
  sessions: ClassSession[]
  occurrences: Occurrence[]
  rooms: Room[]
  onStartRollCall: (sessionId: string, date: string) => void
}) {
  const { t, lang } = useLanguage()
  const roomName = (id: string) =>
    lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn
  const bookedFor = (sessionId: string, date: Date) => {
    const o = occurrences.find((x) => occurrenceKey(x.sessionId, x.date) === occurrenceKey(sessionId, toISODate(date)))
    return o?.booked ?? 0
  }

  return (
    <div className="p-4">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="font-display text-2xl font-extrabold text-card-foreground">{myClasses.length}</p>
          <p className="text-[11px] text-muted-foreground">{t("tea.thisWeek")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="font-display text-2xl font-extrabold text-card-foreground">412</p>
          <p className="text-[11px] text-muted-foreground">{t("tea.thisMonthHeads")}</p>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-foreground">{t("tea.mySchedule")}</h2>
      <ul className="flex flex-col gap-3">
        {myClasses.map((s) => {
          const occurrenceDate = nextOccurrence(s.day)
          const booked = bookedFor(s.id, occurrenceDate)
          return (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <StyleDot style={s.style} />
                <span className="font-display text-base font-bold text-card-foreground">{t(s.style)}</span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {t(weekdayKeys[s.day])} {formatAppDate(occurrenceDate)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {s.start}–{s.end}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {roomName(s.roomId)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {booked}/{s.capacity} {t("tea.students")}
                </span>
              </div>
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => onStartRollCall(s.id, toISODate(occurrenceDate))}
              >
                <ClipboardCheck className="mr-1.5 h-4 w-4" />
                {t("tea.startClass")}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
