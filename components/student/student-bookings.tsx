"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, type UpcomingBooking, type PastBooking, type Teacher, type Room } from "@/lib/types"
import { cancelBooking } from "@/lib/actions/bookings"
import { parseISODate, formatAppDate } from "@/lib/schedule-dates"
import { StyleDot } from "@/components/shared/style-dot"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Clock, MapPin, X } from "lucide-react"

const CANCEL_ERROR_KEY: Record<string, string> = {
  SAME_DAY_CANCEL_BLOCKED: "stu.bookings.err.sameDayCancel",
}
const cancelErrorKeyFor = (code: string) => CANCEL_ERROR_KEY[code] ?? "stu.schedule.err.generic"

export function StudentBookings({
  upcoming,
  history,
  teachers,
  rooms,
}: {
  upcoming: UpcomingBooking[]
  history: PastBooking[]
  teachers: Teacher[]
  rooms: Room[]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const teacherName = (id: string) =>
    lang === "zh" ? teachers.find((x) => x.id === id)?.name : teachers.find((x) => x.id === id)?.nameEn
  const roomName = (id: string) =>
    lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn

  // Same-day bookings can't be self-cancelled at all — cancelBooking always
  // rejects with SAME_DAY_CANCEL_BLOCKED for those, no confirm/override
  // (unlike everywhere else this app throws a recoverable error). Point the
  // student at their teacher instead of leaving the button silently no-op.
  const cancel = (bookingId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await cancelBooking(bookingId)
      if (!result.ok) setError(cancelErrorKeyFor(result.error))
      router.refresh()
    })
  }

  return (
    <div>
      <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("stu.nav.bookings")}</h1>
      </header>

      {error && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>{t(error)}</span>
          <button onClick={() => setError(null)} className="shrink-0" aria-label={t("common.close")}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Tabs defaultValue="upcoming" className="px-4 pt-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">{t("stu.bookings.upcoming")}</TabsTrigger>
          <TabsTrigger value="history">{t("stu.bookings.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-3">
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {t("stu.bookings.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((s) => (
                <li key={s.bookingId} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StyleDot style={s.style} />
                      <span className="font-display text-base font-bold text-card-foreground">
                        {t(s.style)}
                      </span>
                    </div>
                    {s.myState === "waitlist" ? (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        {t("common.onWaitlist")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {t("common.booked")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{t(weekdayKeys[s.day])} {formatAppDate(parseISODate(s.date))}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {s.start}–{s.end}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {roomName(s.roomId)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-foreground/80">{teacherName(s.teacherId)}</p>
                  <div className="mt-3 flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => cancel(s.bookingId)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          {history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {t("stu.bookings.historyEmpty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((s) => (
                <li
                  key={s.bookingId}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 opacity-90"
                >
                  <StyleDot style={s.style} size={12} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-card-foreground">{t(s.style)}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.date} · {s.start} · {teacherName(s.teacherId)}
                    </p>
                  </div>
                  <span
                    className={
                      s.checkedIn
                        ? "rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                        : "rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive"
                    }
                  >
                    {t(s.checkedIn ? "tea.checkedIn" : "stu.bookings.notCheckedIn")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
