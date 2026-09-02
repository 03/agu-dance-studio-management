"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, styleColors, type ClassSession, type ClassClosure, type Occurrence, type Room } from "@/lib/types"
import { toAppDay, toISODate, occurrenceKey, formatAppDate, isSessionActiveOn } from "@/lib/schedule-dates"
import { getOccurrencesForMonth } from "@/lib/actions/schedule"
import { cn } from "@/lib/utils"
import { PeriodBadge } from "@/components/shared/period-badge"
import { MessageCircle, Sparkles, ChevronLeft, ChevronRight, MapPin } from "lucide-react"

type ViewMode = "week" | "month"

// How far a logged-out visitor can browse away from "now" — this is the
// public landing page, not the logged-in student/admin calendars, which
// have no such cap.
const WEEK_OFFSET_LIMIT = 2 // this week ± 2
const MONTH_OFFSET_LIMIT = 1 // this month ± 1

function occurrenceMapFrom(list: Occurrence[]): Map<string, Occurrence> {
  const map = new Map<string, Occurrence>()
  for (const o of list) map.set(occurrenceKey(o.sessionId, o.date), o)
  return map
}

export function PublicSchedule({
  sessions,
  occurrences,
  rooms,
  closures,
}: {
  sessions: ClassSession[]
  occurrences: Occurrence[]
  rooms: Room[]
  closures: ClassClosure[]
}) {
  const { t } = useLanguage()
  const [view, setView] = useState<ViewMode>("week")

  // Occurrence data (booked counts) grows as the visitor navigates the
  // month view — start with what the server eagerly sent (this month +
  // next 7 days), fetch further months on demand, merge and keep forever
  // rather than re-fetching a month we've already seen.
  const [occurrenceMap, setOccurrenceMap] = useState(() => occurrenceMapFrom(occurrences))
  const loadedMonths = useRef(new Set<string>([`${new Date().getFullYear()}-${new Date().getMonth()}`]))

  const ensureMonth = useCallback(async (year: number, month: number) => {
    const key = `${year}-${month}`
    if (loadedMonths.current.has(key)) return
    loadedMonths.current.add(key)
    const fetched = await getOccurrencesForMonth(year, month)
    setOccurrenceMap((prev) => {
      const next = new Map(prev)
      for (const o of fetched) next.set(occurrenceKey(o.sessionId, o.date), o)
      return next
    })
  }, [])

  const bookedFor = useCallback(
    (sessionId: string, date: Date) => occurrenceMap.get(occurrenceKey(sessionId, toISODate(date)))?.booked ?? 0,
    [occurrenceMap],
  )

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          {t("home.schedule.title")}
        </h2>
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setView("week")}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
              view === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("home.schedule.week")}
          </button>
          <button
            onClick={() => setView("month")}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
              view === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("home.schedule.month")}
          </button>
        </div>
      </div>

      {view === "week" ? (
        <WeekView sessions={sessions} bookedFor={bookedFor} ensureMonth={ensureMonth} rooms={rooms} closures={closures} />
      ) : (
        <MonthView sessions={sessions} bookedFor={bookedFor} ensureMonth={ensureMonth} closures={closures} rooms={rooms} />
      )}

      {/* Contact */}
      <div className="mt-14 border-t border-border pt-8">
        <p className="mb-4 text-sm font-semibold text-foreground">{t("home.contact.title")}</p>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            {t("home.contact.wechat")}: <span className="font-medium text-foreground">AguHappy</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("home.contact.xiaohongshu")}: <span className="font-medium text-foreground">833708881</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function WeekView({
  sessions,
  bookedFor,
  ensureMonth,
  rooms,
  closures,
}: {
  sessions: ClassSession[]
  bookedFor: (sessionId: string, date: Date) => number
  ensureMonth: (year: number, month: number) => void
  rooms: Room[]
  closures: ClassClosure[]
}) {
  const { t, lang } = useLanguage()
  const roomNameEn = (roomId: string) => rooms.find((r) => r.id === roomId)?.nameEn
  // Public, pre-login page — deliberately bounded (this week ± 2) rather
  // than open-ended browsing, unlike the logged-in student/admin calendars.
  const [weekOffset, setWeekOffset] = useState(0)
  const canGoPrevWeek = weekOffset > -WEEK_OFFSET_LIMIT
  const canGoNextWeek = weekOffset < WEEK_OFFSET_LIMIT

  // Monday..Sunday of the displayed week, in the viewer's own local
  // timezone — matches admin-attendance.tsx's identical weekDatesOf.
  // Deliberately real dates, not each weekday's "next occurrence": that
  // used to jump a day already past this week straight to next week (e.g.
  // viewing this on a Wednesday, 周二 would show next Tuesday's —
  // still-empty — count instead of the Tuesday that just happened), which
  // visibly disagreed with MonthView's real-date counts for the same day.
  const weekDates = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - toAppDay(today) + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
  }, [weekOffset])

  // A displayed week can span two calendar months (e.g. Aug 31 – Sep 6) —
  // load occurrence data for every month it touches, not just the first,
  // same reasoning as admin-attendance.tsx's own neededMonths.
  useEffect(() => {
    const months = new Set(weekDates.map((d) => `${d.getFullYear()}-${d.getMonth()}`))
    for (const key of months) {
      const [y, m] = key.split("-").map(Number)
      ensureMonth(y, m)
    }
  }, [weekDates, ensureMonth])

  const monday = weekDates[0]
  const sunday = weekDates[6]
  const weekLabel =
    lang === "zh"
      ? monday.getFullYear() === sunday.getFullYear()
        ? `${formatAppDate(monday)} – ${formatAppDate(sunday)}`
        : `${formatAppDate(monday)} ${monday.getFullYear()} – ${formatAppDate(sunday)} ${sunday.getFullYear()}`
      : monday.getFullYear() === sunday.getFullYear()
        ? `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-center gap-3">
        <button
          onClick={() => canGoPrevWeek && setWeekOffset((o) => o - 1)}
          disabled={!canGoPrevWeek}
          aria-label={t("home.schedule.prevWeek")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-[10rem] text-center font-display text-sm font-bold text-card-foreground">{weekLabel}</p>
        <button
          onClick={() => canGoNextWeek && setWeekOffset((o) => o + 1)}
          disabled={!canGoNextWeek}
          aria-label={t("home.schedule.nextWeek")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="ml-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("home.schedule.thisWeek")}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
      <div className="grid min-w-[840px] grid-cols-7">
        {weekDates.map((d, day) => {
          const wk = weekdayKeys[day]
          const dateISO = toISODate(d)
          return (
          <div key={wk} className={cn("min-h-[220px] p-3", day !== 6 && "border-r border-border")}>
            <div className="mb-2 rounded-lg bg-secondary py-1.5 text-center text-xs font-semibold text-secondary-foreground">
              {t(wk)} <span className="font-normal text-muted-foreground">{formatAppDate(d)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {sessions
                .filter((s) => s.day === day && isSessionActiveOn(s, closures, dateISO))
                .map((s) => {
                  const booked = bookedFor(s.id, d)
                  const nameEn = roomNameEn(s.roomId)
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border-l-4 bg-secondary/40 p-2 text-left"
                      style={{ borderLeftColor: styleColors[s.style] }}
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-semibold text-card-foreground">{s.start}</p>
                        <PeriodBadge start={s.start} />
                      </div>
                      <p className="text-xs font-bold text-card-foreground">{t(s.style)}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lang === "zh" ? s.level.zh : s.level.en}
                      </p>
                      {nameEn && (
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="mt-[1px] h-3 w-3 shrink-0" />
                          <span className="truncate">{nameEn}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {booked} {t("home.schedule.enrolled")}
                      </p>
                    </div>
                  )
                })}
            </div>
          </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

function MonthView({
  sessions,
  bookedFor,
  ensureMonth,
  closures,
  rooms,
}: {
  sessions: ClassSession[]
  bookedFor: (sessionId: string, date: Date) => number
  ensureMonth: (year: number, month: number) => void
  closures: ClassClosure[]
  rooms: Room[]
}) {
  const { t, lang } = useLanguage()
  const roomNameEn = (roomId: string) => rooms.find((r) => r.id === roomId)?.nameEn
  // Public, pre-login page — deliberately bounded (this month ± 1) rather
  // than open-ended browsing, unlike the logged-in student/admin calendars.
  const [monthOffset, setMonthOffset] = useState(0)
  const canGoPrevMonth = monthOffset > -MONTH_OFFSET_LIMIT
  const canGoNextMonth = monthOffset < MONTH_OFFSET_LIMIT

  const { weeks, monthLabel, year, month } = useMemo(() => {
    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const year = base.getFullYear()
    const month = base.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstWeekday = toAppDay(new Date(year, month, 1))
    const cells: (Date | null)[] = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks: (Date | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    const monthLabel =
      lang === "zh"
        ? `${year} 年 ${month + 1} 月`
        : base.toLocaleDateString("en-US", { year: "numeric", month: "long" })
    return { weeks, monthLabel, year, month }
  }, [lang, monthOffset])

  // Fetch this month's occurrence data as soon as it's the one on screen —
  // cheap no-op if we've already loaded it (ensureMonth dedupes internally).
  useEffect(() => {
    ensureMonth(year, month)
  }, [year, month, ensureMonth])

  const today = new Date()
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-center gap-3">
        <button
          onClick={() => canGoPrevMonth && setMonthOffset((o) => o - 1)}
          disabled={!canGoPrevMonth}
          aria-label={t("home.schedule.prevMonth")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-[8rem] text-center font-display text-sm font-bold text-card-foreground">{monthLabel}</p>
        <button
          onClick={() => canGoNextMonth && setMonthOffset((o) => o + 1)}
          disabled={!canGoNextMonth}
          aria-label={t("home.schedule.nextMonth")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {monthOffset !== 0 && (
          <button
            onClick={() => setMonthOffset(0)}
            className="ml-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("home.schedule.thisMonth")}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
      <div className="grid min-w-[840px] grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {weekdayKeys.map((wk) => (
          <div key={wk} className="py-1">
            {t(wk)}
          </div>
        ))}
      </div>
      <div className="grid min-w-[840px] grid-cols-7 gap-1">
        {weeks.flatMap((week, wi) =>
          week.map((d, di) => {
            if (!d) return <div key={`${wi}-${di}`} className="min-h-[110px] rounded-lg" />
            const dow = toAppDay(d)
            const dISO = toISODate(d)
            const daySessions = sessions.filter((s) => s.day === dow && isSessionActiveOn(s, closures, dISO))
            return (
              <div
                key={`${wi}-${di}`}
                className={cn(
                  "flex min-h-[110px] flex-col items-center gap-1 rounded-lg border border-transparent p-1",
                  isToday(d) && "border-primary bg-primary/5",
                )}
              >
                <span className={cn("text-xs font-semibold", isToday(d) ? "text-primary" : "text-card-foreground")}>
                  {d.getDate()}
                </span>
                <div className="flex w-full flex-col gap-1">
                  {daySessions.map((s) => {
                    const booked = bookedFor(s.id, d)
                    const nameEn = roomNameEn(s.roomId)
                    return (
                      <div
                        key={s.id}
                        className="w-full rounded-lg border-l-4 bg-secondary/40 p-1.5 text-left"
                        style={{ borderLeftColor: styleColors[s.style] }}
                      >
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] font-semibold text-card-foreground">{s.start}</p>
                          <PeriodBadge start={s.start} className="px-1 text-[8px]" />
                        </div>
                        <p className="truncate text-[10px] font-bold text-card-foreground">{t(s.style)}</p>
                        <p className="truncate text-[9px] text-muted-foreground">
                          {lang === "zh" ? s.level.zh : s.level.en}
                        </p>
                        {nameEn && (
                          <p className="flex items-start gap-1 truncate text-[9px] text-muted-foreground">
                            <MapPin className="mt-[1px] h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{nameEn}</span>
                          </p>
                        )}
                        <p className="text-[9px] text-muted-foreground">
                          {booked} {t("home.schedule.enrolled")}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }),
        )}
      </div>
      </div>
    </div>
  )
}
