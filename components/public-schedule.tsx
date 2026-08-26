"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, styleColors, type ClassSession, type ClassClosure, type Occurrence, type Room } from "@/lib/types"
import { toAppDay, toISODate, occurrenceKey, nextOccurrence, isSessionActiveOn } from "@/lib/schedule-dates"
import { getOccurrencesForMonth } from "@/lib/actions/schedule"
import { cn } from "@/lib/utils"
import { MessageCircle, Sparkles, ChevronLeft, ChevronRight, MapPin } from "lucide-react"

type ViewMode = "week" | "month"

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
    <section className="border-t border-border bg-background px-6 py-14">
      <div className="mx-auto max-w-5xl">
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
          <WeekView sessions={sessions} bookedFor={bookedFor} rooms={rooms} closures={closures} />
        ) : (
          <MonthView sessions={sessions} bookedFor={bookedFor} ensureMonth={ensureMonth} closures={closures} />
        )}
      </div>

      {/* Contact */}
      <div className="mx-auto mt-14 max-w-5xl border-t border-border pt-8">
        <p className="mb-4 text-sm font-semibold text-foreground">{t("home.contact.title")}</p>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            {t("home.contact.wechat")}: <span className="font-medium text-foreground">ABC#1</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("home.contact.xiaohongshu")}: <span className="font-medium text-foreground">REDBOOK#1</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function WeekView({
  sessions,
  bookedFor,
  rooms,
  closures,
}: {
  sessions: ClassSession[]
  bookedFor: (sessionId: string, date: Date) => number
  rooms: Room[]
  closures: ClassClosure[]
}) {
  const { t, lang } = useLanguage()
  const roomNameEn = (roomId: string) => rooms.find((r) => r.id === roomId)?.nameEn
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className="grid min-w-[840px] grid-cols-7">
        {weekdayKeys.map((wk, day) => (
          <div key={wk} className={cn("min-h-[220px] p-3", day !== 6 && "border-r border-border")}>
            <div className="mb-2 rounded-lg bg-secondary py-1.5 text-center text-xs font-semibold text-secondary-foreground">
              {t(wk)}
            </div>
            <div className="flex flex-col gap-2">
              {sessions
                .filter((s) => s.day === day && isSessionActiveOn(s, closures, toISODate(nextOccurrence(s.day))))
                .map((s) => {
                  const booked = bookedFor(s.id, nextOccurrence(s.day))
                  const nameEn = roomNameEn(s.roomId)
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border-l-4 bg-secondary/40 p-2 text-left"
                      style={{ borderLeftColor: styleColors[s.style] }}
                    >
                      <p className="text-[11px] font-semibold text-card-foreground">{s.start}</p>
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
                        {booked}/{s.capacity} {t("home.schedule.enrolled")}
                      </p>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthView({
  sessions,
  bookedFor,
  ensureMonth,
  closures,
}: {
  sessions: ClassSession[]
  bookedFor: (sessionId: string, date: Date) => number
  ensureMonth: (year: number, month: number) => void
  closures: ClassClosure[]
}) {
  const { t, lang } = useLanguage()
  const [monthOffset, setMonthOffset] = useState(0)

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
          onClick={() => setMonthOffset((o) => o - 1)}
          aria-label={t("home.schedule.prevMonth")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-[8rem] text-center font-display text-sm font-bold text-card-foreground">{monthLabel}</p>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          aria-label={t("home.schedule.nextMonth")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {weekdayKeys.map((wk) => (
          <div key={wk} className="py-1">
            {t(wk)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((week, wi) =>
          week.map((d, di) => {
            if (!d) return <div key={`${wi}-${di}`} className="min-h-[104px] rounded-lg" />
            const dow = toAppDay(d)
            const dISO = toISODate(d)
            const daySessions = sessions.filter((s) => s.day === dow && isSessionActiveOn(s, closures, dISO))
            const visible = daySessions.slice(0, 3)
            const overflow = daySessions.length - visible.length
            return (
              <div
                key={`${wi}-${di}`}
                className={cn(
                  "flex min-h-[104px] flex-col items-center gap-1 rounded-lg border border-transparent p-1",
                  isToday(d) && "border-primary bg-primary/5",
                )}
              >
                <span className={cn("text-xs font-semibold", isToday(d) ? "text-primary" : "text-card-foreground")}>
                  {d.getDate()}
                </span>
                <div className="flex w-full flex-col gap-0.5">
                  {visible.map((s) => {
                    const booked = bookedFor(s.id, d)
                    return (
                      <div
                        key={s.id}
                        className="w-full truncate rounded-sm border-l-2 bg-secondary/50 px-1 py-0.5 text-left text-[9px] leading-tight font-medium text-card-foreground"
                        style={{ borderLeftColor: styleColors[s.style] }}
                        title={`${s.start} · ${t(s.style)} · ${lang === "zh" ? s.level.zh : s.level.en} · ${booked}/${s.capacity} ${t("home.schedule.enrolled")}`}
                      >
                        {s.start} {booked}/{s.capacity}
                      </div>
                    )
                  })}
                  {overflow > 0 && (
                    <span className="text-[9px] text-muted-foreground">+{overflow}</span>
                  )}
                </div>
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
