"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, styleColors, type ClassSession, type Occurrence, type Teacher, type Student, type RosterEntry } from "@/lib/types"
import { toAppDay, toISODate, occurrenceKey, formatAppDate } from "@/lib/schedule-dates"
import { getOccurrencesForMonth } from "@/lib/actions/schedule"
import { getRosterForSession } from "@/lib/actions/rollcall"
import { adminBookStudent, adminCancelBooking } from "@/lib/actions/bookings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const ERROR_KEY: Record<string, string> = {
  NO_VALID_CARD: "adm.attendance.err.noValidCard",
  ALREADY_REGISTERED: "adm.attendance.err.alreadyRegistered",
}
const errorKeyFor = (e: unknown) => ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

export function AdminAttendance({
  sessions,
  teachers,
  students,
}: {
  sessions: ClassSession[]
  teachers: Teacher[]
  students: Student[]
}) {
  const { t, lang } = useLanguage()
  const [monthOffset, setMonthOffset] = useState(0)
  const [occurrenceMap, setOccurrenceMap] = useState<Map<string, Occurrence>>(new Map())
  const loadedMonths = useRef(new Set<string>())
  const [selected, setSelected] = useState<{ session: ClassSession; date: Date } | null>(null)

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

  const ensureMonth = useCallback(async (y: number, m: number) => {
    const key = `${y}-${m}`
    if (loadedMonths.current.has(key)) return
    loadedMonths.current.add(key)
    const fetched = await getOccurrencesForMonth(y, m)
    setOccurrenceMap((prev) => {
      const next = new Map(prev)
      for (const o of fetched) next.set(occurrenceKey(o.sessionId, o.date), o)
      return next
    })
  }, [])

  useEffect(() => {
    ensureMonth(year, month)
  }, [year, month, ensureMonth])

  // After an add/remove inside the roster dialog, this month's booked
  // counts are stale — drop it from the loaded-months cache and re-fetch so
  // the calendar cells still on screen update without a full page reload.
  const refreshMonth = useCallback(() => {
    loadedMonths.current.delete(`${year}-${month}`)
    ensureMonth(year, month)
  }, [year, month, ensureMonth])

  const bookedFor = useCallback(
    (sessionId: string, date: Date) => occurrenceMap.get(occurrenceKey(sessionId, toISODate(date)))?.booked ?? 0,
    [occurrenceMap],
  )

  const teacherName = useCallback(
    (id: string) => {
      const tc = teachers.find((x) => x.id === id)
      return tc ? (lang === "zh" ? tc.name : tc.nameEn) : ""
    },
    [teachers, lang],
  )

  const today = new Date()
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">{t("adm.nav.attendance")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("adm.attendance.desc")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonthOffset((o) => o - 1)}
            aria-label={t("home.schedule.prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[8rem] text-center font-display text-sm font-bold text-card-foreground">{monthLabel}</p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonthOffset((o) => o + 1)}
            aria-label={t("home.schedule.nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {monthOffset !== 0 && (
            <Button variant="outline" size="sm" className="ml-1" onClick={() => setMonthOffset(0)}>
              {t("home.schedule.thisMonth")}
            </Button>
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
              if (!d) return <div key={`${wi}-${di}`} className="min-h-[112px] rounded-lg" />
              const dow = toAppDay(d)
              const daySessions = sessions.filter((s) => s.day === dow)
              return (
                <div
                  key={`${wi}-${di}`}
                  className={cn(
                    "flex min-h-[112px] flex-col items-center gap-1 rounded-lg border border-transparent p-1",
                    isToday(d) && "border-primary bg-primary/5",
                  )}
                >
                  <span className={cn("text-xs font-semibold", isToday(d) ? "text-primary" : "text-card-foreground")}>
                    {d.getDate()}
                  </span>
                  <div className="flex w-full flex-col gap-0.5">
                    {daySessions.map((s) => {
                      const booked = bookedFor(s.id, d)
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelected({ session: s, date: d })}
                          className="w-full truncate rounded-sm border-l-2 bg-secondary/50 px-1 py-0.5 text-left text-[9px] leading-tight font-medium text-card-foreground transition-colors hover:bg-secondary"
                          style={{ borderLeftColor: styleColors[s.style] }}
                          title={`${s.start} · ${t(s.style)} · ${teacherName(s.teacherId)} · ${booked}/${s.capacity}`}
                        >
                          {s.start} {t(s.style)} {booked}/{s.capacity}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            }),
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <RosterDialog
              session={selected.session}
              date={selected.date}
              teacherName={teacherName(selected.session.teacherId)}
              students={students}
              onClose={() => setSelected(null)}
              onChanged={refreshMonth}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RosterDialog({
  session,
  date,
  teacherName,
  students,
  onClose,
  onChanged,
}: {
  session: ClassSession
  date: Date
  teacherName: string
  students: Student[]
  onClose: () => void
  onChanged: () => void
}) {
  const { t, lang } = useLanguage()
  const dateISO = toISODate(date)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getRosterForSession(session.id, dateISO).then((r) => {
      setRoster(r)
      setLoading(false)
    })
  }, [session.id, dateISO])

  useEffect(() => {
    load()
  }, [load])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return students.filter((s) => s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q)).slice(0, 8)
  }, [query, students])

  const handleAdd = (studentId: string) => {
    setError(null)
    setPendingId(studentId)
    startTransition(async () => {
      try {
        await adminBookStudent(session.id, dateISO, studentId)
        setQuery("")
        load()
        onChanged()
      } catch (e) {
        setError(errorKeyFor(e))
      } finally {
        setPendingId(null)
      }
    })
  }

  const handleRemove = (bookingId: string) => {
    setError(null)
    setPendingId(bookingId)
    startTransition(async () => {
      try {
        await adminCancelBooking(bookingId)
        load()
        onChanged()
      } catch (e) {
        setError(errorKeyFor(e))
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {t(session.style)} · {formatAppDate(date)} {session.start}–{session.end}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <p className="-mt-2 text-xs text-muted-foreground">
          {teacherName} · {lang === "zh" ? session.level.zh : session.level.en}
        </p>

        <div className="grid gap-2">
          <Label>{t("adm.attendance.addStudent")}</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("adm.attendance.searchPlaceholder")}
          />
          {matches.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-xl border border-border">
              {matches.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <span className="truncate">
                    {s.name}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && pendingId === s.id}
                    onClick={() => handleAdd(s.id)}
                  >
                    {t("common.add")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{t(error)}</p>}

        <div>
          <Label>
            {t("adm.attendance.roster")} ({roster.length})
          </Label>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}…</p>
          ) : roster.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("adm.attendance.empty")}</p>
          ) : (
            <ul className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border">
              {roster.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <span>{r.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={isPending && pendingId === r.id}
                    onClick={() => handleRemove(r.id)}
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>
      </DialogFooter>
    </>
  )
}
