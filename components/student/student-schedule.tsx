"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, type ClassSession, type ClassClosure, type Occurrence, type StyleKey, type Teacher, type Room } from "@/lib/types"
import { bookClass, getBookedNamesForSession } from "@/lib/actions/bookings"
import { toAppDay, toISODate, occurrenceKey, formatAppDate as formatDate, isSessionActiveOn } from "@/lib/schedule-dates"
import { StyleDot } from "@/components/shared/style-dot"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Clock, MapPin, Users, ListOrdered, X } from "lucide-react"
import { cn } from "@/lib/utils"

const BOOKING_ERROR_KEY: Record<string, string> = {
  NO_VALID_CARD: "stu.schedule.err.noValidCard",
  NO_LINKED_STUDENT: "stu.schedule.err.generic",
  SESSION_NOT_ACTIVE: "stu.schedule.err.sessionNotActive",
}
const bookingErrorKeyFor = (e: unknown) => BOOKING_ERROR_KEY[e instanceof Error ? e.message : ""] ?? "stu.schedule.err.generic"

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
  closures,
}: {
  sessions: ClassSession[]
  occurrences: Occurrence[]
  teachers: Teacher[]
  rooms: Room[]
  closures: ClassClosure[]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [styleFilter, setStyleFilter] = useState<string>("all")
  const [teacherFilter, setTeacherFilter] = useState<string>("all")
  const [rosterSessionId, setRosterSessionId] = useState<string | null>(null)
  const [rosterNames, setRosterNames] = useState<string[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateConfirm, setDuplicateConfirm] = useState<(ClassSession & { myState: Occurrence["myState"] }) | null>(null)

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
      .filter((s) => s.day === selectedDayOfWeek && isSessionActiveOn(s, closures, selectedDateISO))
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

  const openRoster = (sessionId: string) => {
    setRosterSessionId(sessionId)
    setRosterLoading(true)
    getBookedNamesForSession(sessionId, selectedDateISO).then((names) => {
      setRosterNames(names)
      setRosterLoading(false)
    })
  }

  // Booking-only now — cancelling a specific 接龙 entry happens in 我的预约,
  // where each of a student's bookings (including duplicates, see below)
  // has its own row and its own cancel button. This button always tries to
  // add a booking; if the student already has an active one for this
  // occurrence, `bookClass` throws ALREADY_BOOKED and we show the same
  // confirm-first prompt admins see, rather than silently no-op'ing or
  // greying the button out — a student bringing a friend along without
  // giving them their own account books under their own name again here.
  const attemptBook = (s: ClassSession & { myState: Occurrence["myState"] }, allowDuplicate: boolean) => {
    setError(null)
    setPendingId(s.id)
    startTransition(async () => {
      try {
        await bookClass(s.id, selectedDateISO, allowDuplicate)
        setDuplicateConfirm(null)
        router.refresh()
      } catch (e) {
        if (e instanceof Error && e.message === "ALREADY_BOOKED") {
          setDuplicateConfirm(s)
        } else {
          setError(bookingErrorKeyFor(e))
        }
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div>
      <header className="sticky top-0 z-10 bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("stu.schedule.title")}</h1>

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

      {error && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>{t(error)}</span>
          <button onClick={() => setError(null)} className="shrink-0" aria-label={t("common.close")}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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

                <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                  {st !== "none" && (
                    <span
                      className={cn(
                        "self-end rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        st === "waitlist" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary",
                      )}
                    >
                      {st === "waitlist" ? t("common.onWaitlist") : t("common.booked")}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={st === "none" && isFull ? "outline" : "default"}
                    disabled={isPastDay || (isPending && pendingId === s.id)}
                    onClick={() => attemptBook(s, false)}
                  >
                    {st !== "none"
                      ? t("stu.schedule.bookAgain")
                      : isFull
                        ? t("common.waitlist")
                        : t("common.book")}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => openRoster(s.id)}>
                    <ListOrdered className="h-3.5 w-3.5" />
                    {t("stu.roster.button")}
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={rosterSessionId !== null} onOpenChange={(open) => !open && setRosterSessionId(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display">{t("stu.roster.title")}</DialogTitle>
          </DialogHeader>
          {rosterLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}…</p>
          ) : rosterNames.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("stu.roster.empty")}</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto py-1">
              {rosterNames.map((name, i) => (
                <li
                  key={`${name}-${i}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-card-foreground"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  {name}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicateConfirm} onOpenChange={(o) => !o && setDuplicateConfirm(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-base">{t("booking.confirmDuplicate")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateConfirm(null)}>
              {t("common.dismiss")}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => duplicateConfirm && attemptBook(duplicateConfirm, true)}
            >
              {t("common.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
