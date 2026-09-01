import { getPublicRosterView } from "@/lib/data"

const WEEKDAY_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

// Pure calendar-date arithmetic (no timezone conversion needed) — same
// reasoning as lib/schedule-dates.ts's addDays: a weekday-of-week lookup
// from a Y-M-D triple doesn't depend on where this code runs.
function weekdayLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number)
  return WEEKDAY_ZH[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

// Public, unauthenticated, read-only — a link an admin generates from
// 课时登记 and shares outside the app (a parent group chat, the teacher's
// own phone). No login, no mutation affordances: just today's snapshot of
// one class occurrence and who's on it. See lib/data.ts's
// getPublicRosterView for exactly what this is (and isn't) allowed to show.
export default async function PublicRosterPage({
  params,
}: {
  params: Promise<{ sessionId: string; date: string }>
}) {
  const { sessionId, date } = await params
  const view = await getPublicRosterView(sessionId, date)

  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">这个链接指向的课程不存在，可能已被删除。</p>
      </main>
    )
  }

  const booked = view.roster.filter((r) => !r.waitlisted)
  const waitlisted = view.roster.filter((r) => r.waitlisted)

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-[11px] font-extrabold text-primary-foreground">
            A
          </span>
          Agu 舞蹈工作室 · 课程接龙名单
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="font-display text-xl font-bold text-card-foreground">{view.styleZh}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{view.levelZh}</p>

          <div className="mt-4 flex flex-col gap-1.5 text-sm text-card-foreground">
            <p>
              {weekdayLabel(view.dateISO)} {view.dateISO} · {view.start}–{view.end}
            </p>
            <p>
              {view.roomName}
              {view.roomAddress ? ` · ${view.roomAddress}` : ""}
            </p>
            <p>带课老师：{view.teacherName}</p>
            <p>
              {booked.length} 已报名
              {waitlisted.length > 0 ? ` · ${waitlisted.length} 候补` : ""}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-card-foreground">接龙名单</p>
          {view.roster.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">还没有人接龙</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {view.roster.map((r) => (
                <li key={r.position} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                    {r.position}
                  </span>
                  <span className="truncate text-card-foreground">{r.name}</span>
                  {r.waitlisted && (
                    <span className="ml-auto shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                      候补
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          这是一个只读链接，仅展示当前报名情况，不能用于报名或取消。
        </p>
      </div>
    </main>
  )
}
