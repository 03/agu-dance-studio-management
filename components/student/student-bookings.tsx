"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, type UpcomingBooking, type Teacher, type Room } from "@/lib/types"
import { cancelBooking } from "@/lib/actions/bookings"
import { parseISODate, formatAppDate } from "@/lib/schedule-dates"
import { StyleDot } from "@/components/shared/style-dot"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Clock, MapPin } from "lucide-react"

const historyItems = [
  { id: "h1", style: "style.contemporary" as const, teacherId: "t3", date: "11.18", start: "19:00", end: "20:30", roomId: "r2", day: 0 },
  { id: "h2", style: "style.kpop" as const, teacherId: "t1", date: "11.28", start: "19:30", end: "20:30", roomId: "r1", day: 4 },
  { id: "h3", style: "style.jazz" as const, teacherId: "t1", date: "12.07", start: "19:00", end: "20:00", roomId: "r1", day: 5 },
]

export function StudentBookings({
  upcoming,
  teachers,
  rooms,
}: {
  upcoming: UpcomingBooking[]
  teachers: Teacher[]
  rooms: Room[]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const teacherName = (id: string) =>
    lang === "zh" ? teachers.find((x) => x.id === id)?.name : teachers.find((x) => x.id === id)?.nameEn
  const roomName = (id: string) =>
    lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn

  const cancel = (sessionId: string, date: string) => {
    startTransition(async () => {
      await cancelBooking(sessionId, date)
      router.refresh()
    })
  }

  return (
    <div>
      <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("stu.nav.bookings")}</h1>
      </header>

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
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t("stu.cancelRule")}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => cancel(s.sessionId, s.date)}
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
          <ul className="flex flex-col gap-3">
            {historyItems.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 opacity-90">
                <StyleDot style={s.style} size={12} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground">{t(s.style)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.date} · {s.start} · {teacherName(s.teacherId)}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {t("tea.checkedIn")}
                </span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  )
}
