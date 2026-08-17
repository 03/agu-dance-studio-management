"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, type ClassSession, type Occurrence, type StyleKey, type Teacher, type Room } from "@/lib/types"
import { bookClass, cancelBooking } from "@/lib/actions/bookings"
import { toAppDay, toISODate, occurrenceKey, formatAppDate as formatDate } from "@/lib/schedule-dates"
import { StyleDot } from "@/components/shared/style-dot"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock, MapPin, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const styleKeys: StyleKey[] = [
  "style.jazz",
  "style.hiphop",
  "style.ballet",
  "style.kpop",
  "style.contemporary",
  "style.latin",
  "style.jazzKpop",
]

export function StudentSchedule({
  sessions: allSessions,
  occurrences,
  teachers,
  rooms,
}: {
  sessions: ClassSession[]
  occurrences: Occurrence[]
  teachers: Teacher[]
  rooms: Room[]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [styleFilter, setStyleFilter] = useState<string>("all")
  const [teacherFilter, setTeacherFilter] = useState<string>("all")

  // Browsable window: the 2 days before today through the next 2 weeks
  // (today counted as day 1 of those two weeks) — 16 real calendar dates
  // total, today always at a fixed offset so it's the default selection.
  const DAYS_BEFORE = 2
  const DAYS_TOTAL = 16
  const TODAY_INDEX = DAYS_BEFORE

  const dates = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: DAYS_TOTAL }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - DAYS_BEFORE + i)
      return d
    })
  }, [])

  const [selectedIndex, setSelectedIndex] = useState(TODAY_INDEX)

  const selectedDate = dates[selectedIndex]
  const selectedDateISO = toISODate(selectedDate)
  const selectedDayOfWeek = toAppDay(selectedDate)
  const isPastDay = selectedIndex < TODAY_INDEX

  // Occurrence data (booked count, my own booking state) is fetched
  // separately from the recurring session templates and only makes sense
  // paired with a specific date — look it up per session for whichever
  // date is currently selected in the picker.
  const occurrenceMap = useMemo(() => {
    const map = new Map<string, Occurrence>()
    for (const o of occurrences) map.set(occurrenceKey(o.sessionId, o.date), o)
    return map
  }, [occurrences])

  const dayList = useMemo(() => {
    return allSessions
      .filter((s) => s.day === selectedDayOfWeek)
      .map((s) => {
        const occ = occurrenceMap.get(occurrenceKey(s.id, selectedDateISO))
        return { ...s, booked: occ?.booked ?? 0, myState: occ?.myState ?? "none" }
      })
  }, [allSessions, selectedDayOfWeek, occurrenceMap, selectedDateISO])

  const filtered = dayList.filter((s) => {
    if (styleFilter !== "all" && s.style !== styleFilter) return false
    if (teacherFilter !== "all" && s.teacherId !== teacherFilter) return false
    return true
  })

  const teacherName = (id: string) => {
    const tc = teachers.find((x) => x.id === id)
    return tc ? (lang === "zh" ? tc.name : tc.nameEn) : ""
  }
  const roomName = (id: string) => {
    const r = rooms.find((x) => x.id === id)
    return r ? (lang === "zh" ? r.name : r.nameEn) : ""
  }

  const toggle = (s: ClassSession & { myState: Occurrence["myState"] }) => {
    setPendingId(s.id)
    startTransition(async () => {
      if (s.myState === "none") {
        await bookClass(s.id, selectedDateISO)
      } else {
        await cancelBooking(s.id, selectedDateISO)
      }
      router.refresh()
      setPendingId(null)
    })
  }

  return (
    <div>
      <header className="sticky top-0 z-10 bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("stu.schedule.title")}</h1>
        <p className="mt-0.5 text-xs text-primary-foreground/70">{t("stu.cancelRule")}</p>

        {/* Day picker */}
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {dates.map((d, i) => {
            const active = i === selectedIndex
            const isToday = i === TODAY_INDEX
            const dow = toAppDay(d)
            const count = allSessions.filter((s) => s.day === dow).length
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "relative flex min-w-[3.25rem] flex-col items-center rounded-xl py-2 text-xs transition-colors",
                  active
                    ? "bg-primary-foreground text-primary"
                    : "bg-primary-foreground/10 text-primary-foreground/80",
                )}
              >
                {isToday && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 h-2 w-2 rounded-full",
                      active ? "bg-accent" : "bg-accent-foreground",
                    )}
                  />
                )}
                <span className="font-semibold">{t(weekdayKeys[dow])}</span>
                <span className="mt-0.5 text-[10px] opacity-80">{formatDate(d)}</span>
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-3">
        <Select value={styleFilter} onValueChange={setStyleFilter}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder={t("stu.filter.style")}>
              {(v: string) => (v === "all" ? t("common.all") : t(v))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {styleKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {t(k)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder={t("stu.filter.teacher")}>
              {(v: string) => (v === "all" ? t("common.all") : teacherName(v))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {teachers.map((tc) => (
              <SelectItem key={tc.id} value={tc.id}>
                {lang === "zh" ? tc.name : tc.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class list */}
      <ul className="flex flex-col gap-3 px-4 pb-4">
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            {t("common.all")} · {t(weekdayKeys[selectedDayOfWeek])} {formatDate(selectedDate)}
          </li>
        )}
        {filtered.map((s) => {
          const st = s.myState ?? "none"
          const isFull = s.booked >= s.capacity && st !== "booked"
          const spotsLeft = Math.max(0, s.capacity - s.booked)
          return (
            <li
              key={s.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StyleDot style={s.style} />
                    <span className="truncate font-display text-base font-bold text-card-foreground">
                      {t(s.style)}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      {lang === "zh" ? s.level.zh : s.level.en}
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
                      {isFull ? (
                        <span className="text-destructive">{t("common.full")}</span>
                      ) : (
                        <>
                          {spotsLeft} {t("common.remaining")}
                        </>
                      )}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-foreground/80">
                    {teacherName(s.teacherId)}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant={
                    st === "booked"
                      ? "secondary"
                      : st === "waitlist"
                        ? "outline"
                        : isFull
                          ? "outline"
                          : "default"
                  }
                  className="shrink-0"
                  disabled={isPastDay || (isPending && pendingId === s.id)}
                  onClick={() => toggle(s)}
                >
                  {st === "booked"
                    ? t("common.booked")
                    : st === "waitlist"
                      ? t("common.onWaitlist")
                      : isFull
                        ? t("common.waitlist")
                        : t("common.book")}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
