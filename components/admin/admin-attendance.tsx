"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, styleColors, type ClassSession, type Occurrence, type Teacher, type Student, type RosterEntry } from "@/lib/types"
import { toAppDay, toISODate, parseISODate, occurrenceKey, formatAppDate } from "@/lib/schedule-dates"
import { getOccurrencesForMonth } from "@/lib/actions/schedule"
import { getRosterForSession } from "@/lib/actions/rollcall"
import { adminBookStudent, adminCancelBooking } from "@/lib/actions/bookings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHead } from "@/components/ui/sortable-head"
import { ChevronLeft, ChevronRight, Trash2, CalendarSearch } from "lucide-react"
import { cn } from "@/lib/utils"

type RosterSortField = "name" | "remainingSessions" | "createdAt"
type RosterSortDir = "asc" | "desc"

function compareRoster(a: RosterEntry, b: RosterEntry, field: RosterSortField, dir: RosterSortDir): number {
  const av = a[field]
  const bv = b[field]
  const mul = dir === "asc" ? 1 : -1
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul
  return String(av).localeCompare(String(bv)) * mul
}

const ERROR_KEY: Record<string, string> = {
  NO_VALID_CARD: "adm.attendance.err.noValidCard",
  ALREADY_REGISTERED: "adm.attendance.err.alreadyRegistered",
  SESSION_NOT_ACTIVE: "adm.attendance.err.sessionNotActive",
}
const errorKeyFor = (e: unknown) => ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

// Monday..Sunday of the week containing `d`, per this app's day convention
// (toAppDay: 0=Mon..6=Sun).
function weekDatesOf(d: Date): Date[] {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - toAppDay(d))
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`
}

// getOccurrencesForMonth only returns (session, date) pairs that currently
// have at least one booking — a date that just dropped to zero after a
// removal simply isn't in the response at all. True for a given occurrence
// key: does its date fall in this (year, month)?
function keyInMonth(key: string, year: number, month: number): boolean {
  const iso = key.split("__")[1]
  if (!iso) return false
  const [y, m] = iso.split("-").map(Number)
  return y === year && m === month + 1
}

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
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [occurrenceMap, setOccurrenceMap] = useState<Map<string, Occurrence>>(new Map())
  const loadedMonths = useRef(new Set<string>())
  const [selected, setSelected] = useState<{ session: ClassSession; date: Date } | null>(null)
  const [jumpOpen, setJumpOpen] = useState(false)

  const weekDates = useMemo(() => weekDatesOf(anchorDate), [anchorDate])
  // A week can straddle two calendar months (e.g. Aug 31 – Sep 6) — load
  // occurrence data for every month the visible week touches.
  const neededMonths = useMemo(() => {
    const keys = new Map<string, { year: number; month: number }>()
    for (const d of weekDates) keys.set(monthKey(d), { year: d.getFullYear(), month: d.getMonth() })
    return [...keys.values()]
  }, [weekDates])

  const ensureMonth = useCallback(async (year: number, month: number) => {
    const key = `${year}-${month}`
    if (loadedMonths.current.has(key)) return
    loadedMonths.current.add(key)
    const fetched = await getOccurrencesForMonth(year, month)
    setOccurrenceMap((prev) => {
      const next = new Map(prev)
      // Drop this month's existing entries first — a date whose booked
      // count just fell to zero won't be in `fetched` at all, so without
      // this its stale non-zero count would linger forever.
      for (const k of next.keys()) {
        if (keyInMonth(k, year, month)) next.delete(k)
      }
      for (const o of fetched) next.set(occurrenceKey(o.sessionId, o.date), o)
      return next
    })
  }, [])

  useEffect(() => {
    for (const { year, month } of neededMonths) ensureMonth(year, month)
  }, [neededMonths, ensureMonth])

  // After an add/remove inside the roster dialog, the visible week's booked
  // counts are stale — drop its month(s) from the loaded cache and re-fetch
  // so the week grid still on screen updates without a full page reload.
  const refreshWeek = useCallback(() => {
    for (const { year, month } of neededMonths) loadedMonths.current.delete(`${year}-${month}`)
    for (const { year, month } of neededMonths) ensureMonth(year, month)
  }, [neededMonths, ensureMonth])

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
  const isCurrentWeek = weekDates.some(isToday)

  const monday = weekDates[0]
  const sunday = weekDates[6]
  const weekLabel =
    lang === "zh"
      ? monday.getFullYear() === sunday.getFullYear()
        ? `${monday.getFullYear()} 年 ${formatAppDate(monday)} – ${formatAppDate(sunday)}`
        : `${formatAppDate(monday)} ${monday.getFullYear()} – ${formatAppDate(sunday)} ${sunday.getFullYear()}`
      : monday.getFullYear() === sunday.getFullYear()
        ? `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">{t("adm.nav.attendance")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("adm.attendance.desc")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}
            aria-label={t("adm.attendance.prevWeek")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[11rem] text-center font-display text-sm font-bold text-card-foreground">{weekLabel}</p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}
            aria-label={t("adm.attendance.nextWeek")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date()
                d.setHours(0, 0, 0, 0)
                setAnchorDate(d)
              }}
            >
              {t("adm.attendance.thisWeek")}
            </Button>
          )}
          <Button variant="outline" size="sm" className="ml-1" onClick={() => setJumpOpen(true)}>
            <CalendarSearch className="mr-1.5 h-3.5 w-3.5" />
            {t("adm.attendance.jumpToDate")}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7 gap-1">
            {weekDates.map((d, i) => {
              const dow = toAppDay(d)
              const daySessions = sessions.filter((s) => s.day === dow)
              return (
                <div
                  key={i}
                  className={cn(
                    "flex min-h-[220px] flex-col items-center gap-1 rounded-lg border border-transparent p-1.5",
                    isToday(d) && "border-primary bg-primary/5",
                  )}
                >
                  <div className="mb-1 w-full rounded-lg bg-secondary py-1.5 text-center">
                    <p className="text-[11px] font-semibold text-secondary-foreground">{t(weekdayKeys[dow])}</p>
                    <p className={cn("text-[11px]", isToday(d) ? "font-bold text-primary" : "text-muted-foreground")}>
                      {formatAppDate(d)}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-1">
                    {daySessions.map((s) => {
                      const booked = bookedFor(s.id, d)
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelected({ session: s, date: d })}
                          className="w-full truncate rounded-md border-l-2 bg-secondary/50 px-1.5 py-1 text-left text-[10px] leading-tight font-medium text-card-foreground transition-colors hover:bg-secondary"
                          style={{ borderLeftColor: styleColors[s.style] }}
                          title={`${s.start} · ${t(s.style)} · ${teacherName(s.teacherId)} · ${booked}/${s.capacity}`}
                        >
                          <span className="block font-semibold">{s.start}</span>
                          <span className="block truncate">{t(s.style)}</span>
                          <span className="block text-muted-foreground">
                            {booked}/{s.capacity}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <RosterDialog
              session={selected.session}
              date={selected.date}
              teacherName={teacherName(selected.session.teacherId)}
              students={students}
              onClose={() => setSelected(null)}
              onChanged={refreshWeek}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={jumpOpen} onOpenChange={setJumpOpen}>
        <DialogContent>
          <JumpToDateForm
            onJump={(d) => {
              setAnchorDate(d)
              setJumpOpen(false)
            }}
            onClose={() => setJumpOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function JumpToDateForm({ onJump, onClose }: { onJump: (d: Date) => void; onClose: () => void }) {
  const { t } = useLanguage()
  const [value, setValue] = useState("")

  const handleConfirm = () => {
    if (!value) return
    onJump(parseISODate(value))
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("adm.attendance.jumpToDate")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("adm.attendance.jumpToDateDesc")}</Label>
          <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button onClick={handleConfirm} disabled={!value}>
          {t("common.confirm")}
        </Button>
      </DialogFooter>
    </>
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
  const router = useRouter()
  const dateISO = toISODate(date)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ field: RosterSortField; dir: RosterSortDir }>({ field: "createdAt", dir: "asc" })

  const handleSort = (field: RosterSortField) => {
    setSort((prev) => (prev.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }))
  }
  const sortedRoster = [...roster].sort((a, b) => compareRoster(a, b, sort.field, sort.dir))

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
        // Balance/roster changes here also affect 学员管理's student list
        // and other admin pages, which get their data from the top-level
        // AdminAppData fetched once on load — router.refresh() re-runs that
        // fetch so switching tabs shows current numbers instead of stale
        // ones from before this add.
        router.refresh()
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
        router.refresh()
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
            <div className="mt-2 max-h-60 overflow-x-auto overflow-y-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="name" label={t("common.name")} sort={sort} onSort={handleSort} />
                    <SortableHead
                      field="remainingSessions"
                      label={t("adm.attendance.remainingSessions")}
                      sort={sort}
                      onSort={handleSort}
                      className="whitespace-nowrap"
                    />
                    <SortableHead
                      field="createdAt"
                      label={t("adm.attendance.registeredAt")}
                      sort={sort}
                      onSort={handleSort}
                      className="whitespace-nowrap"
                    />
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRoster.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[9rem] truncate text-card-foreground" title={r.name}>
                        {r.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                            r.remainingSessions <= 2
                              ? "bg-destructive/10 text-destructive"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {r.remainingSessions}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{r.createdAt}</TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
