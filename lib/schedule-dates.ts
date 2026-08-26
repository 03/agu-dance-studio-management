// ClassSession.day is a recurring weekly slot (0=Mon..6=Sun), not tied to a
// specific calendar date — these helpers convert between the two so the UI
// can show a real, always-current date instead of a stale stored label.
//
// Every function here is anchored explicitly to the studio's own timezone
// via Intl, rather than the runtime's ambient timezone (`new Date(y, m, d)`,
// `.getFullYear()`, etc.). That ambient-timezone approach broke the moment
// this app ran somewhere other than a Melbourne-timezone machine — e.g. a
// serverless/cloud deploy that defaults to UTC computed different calendar
// -date boundaries than local dev, so the exact same booking data produced
// different booked-counts depending on where the process happened to run.
// Being explicit here makes every caller correct regardless of deployment
// environment, with no reliance on a `TZ` env var actually being honored.
const STUDIO_TZ = "Australia/Melbourne"

// {year, month, day, hour, minute, second} as they'd read on a clock in
// STUDIO_TZ for instant `d` — independent of the runtime's own timezone.
// Exported for callers that need the components directly (e.g. bucketing a
// list of Dates by calendar month/year) rather than a formatted string.
export function studioDateParts(d: Date) {
  return studioParts(d)
}

function studioParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value
  // Some engines render midnight as "24" under hour12:false — normalize.
  const hour = parts.hour === "24" ? 0 : Number(parts.hour)
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

// The UTC instant corresponding to STUDIO_TZ wall-clock Y-M-D 00:00:00,
// DST-aware. Standard offset-discovery technique: guess in UTC, read what
// that guess actually says on a Melbourne clock, then correct by the
// difference — avoids needing a timezone-database dependency.
function studioMidnightUTC(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day))
  const asStudio = studioParts(guess)
  const asIfUTC = Date.UTC(asStudio.year, asStudio.month - 1, asStudio.day, asStudio.hour, asStudio.minute, asStudio.second)
  const offsetMs = asIfUTC - guess.getTime()
  return new Date(guess.getTime() - offsetMs)
}

export function toAppDay(d: Date): number {
  const { year, month, day } = studioParts(d)
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay() // 0 = Sun ... 6 = Sat
  return jsDay === 0 ? 6 : jsDay - 1
}

export function formatAppDate(d: Date): string {
  const { month, day } = studioParts(d)
  return `${month}.${String(day).padStart(2, "0")}`
}

// The next real calendar date this recurring weekday slot falls on,
// counting today itself if it matches (0-6 days out).
export function nextOccurrence(day: number, from = new Date()): Date {
  const { year, month, day: d } = studioParts(from)
  const base = studioMidnightUTC(year, month, d)
  let diff = day - toAppDay(base)
  if (diff < 0) diff += 7
  // Date.UTC normalizes an out-of-range day (e.g. day 32) into the correct
  // following month/year, so this is safe across month/year boundaries.
  const advanced = new Date(Date.UTC(year, month - 1, d + diff))
  return studioMidnightUTC(advanced.getUTCFullYear(), advanced.getUTCMonth() + 1, advanced.getUTCDate())
}

// Bookings are scoped to one specific calendar occurrence of a recurring
// session (see Booking.date in schema.prisma). These pair up to move that
// date across the client/server boundary without the classic
// `new Date("YYYY-MM-DD")` bug — that parses as UTC midnight, which can
// silently shift a day depending on the reader's local timezone offset.
// Always go through toISODate/parseISODate together, never bare Date(iso).
export function toISODate(d: Date): string {
  const { year, month, day } = studioParts(d)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return studioMidnightUTC(y, m, d)
}

// Today's date in the studio's timezone, as an ISO "YYYY-MM-DD" string —
// the timezone-safe replacement for `new Date()` + ambient getters whenever
// code means "today" as a calendar date rather than the current instant.
export function todayISO(): string {
  return toISODate(new Date())
}

// `iso` shifted by `days` calendar days (may be negative). Pure calendar-date
// arithmetic on the Y-M-D triple — no timezone conversion involved, since a
// day-count offset between two calendar dates doesn't depend on where the
// code runs. Use instead of `date.setDate(date.getDate() + n)` wherever the
// input/output are ISO calendar dates rather than real-time instants.
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const advanced = new Date(Date.UTC(y, m - 1, d + days))
  return `${advanced.getUTCFullYear()}-${String(advanced.getUTCMonth() + 1).padStart(2, "0")}-${String(advanced.getUTCDate()).padStart(2, "0")}`
}

// [start, end) real-time bounds of one calendar month in the studio's
// timezone — `month` is 0-indexed (JS Date convention) to match existing
// call sites like `date.getMonth()`. Use for Prisma date-range queries
// instead of `new Date(year, month, 1)` / `new Date(year, month + 1, 1)`,
// which silently used the server process's ambient timezone.
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: studioMidnightUTC(year, month + 1, 1),
    end: studioMidnightUTC(year, month + 2, 1),
  }
}

// [start, end) real-time bounds of one calendar year in the studio's
// timezone — the year-scoped counterpart to monthRange.
export function yearRange(year: number): { start: Date; end: Date } {
  return {
    start: studioMidnightUTC(year, 1, 1),
    end: studioMidnightUTC(year + 1, 1, 1),
  }
}

// Lookup key for a (session, occurrence date) pair — same key on client and
// server so Occurrence data fetched separately from ClassSession templates
// can be joined by simple map lookup.
export function occurrenceKey(sessionId: string, date: Date | string): string {
  const iso = typeof date === "string" ? date : toISODate(date)
  return `${sessionId}__${iso}`
}

// Whether a recurring session actually runs on one specific calendar date —
// `day` matching alone (the only thing ClassSession itself used to encode)
// isn't sufficient once a session can be bounded to its own lifetime
// (startDate/endDate — e.g. a holiday-only intensive) or temporarily paused
// by a ClassClosure (a shared school-holiday break, or one session's short
// leave — see prisma/schema.prisma for how the two differ). All dates are
// ISO "YYYY-MM-DD", which — being zero-padded — compare correctly with
// plain string operators, so no Date parsing is needed here.
export function isSessionActiveOn(
  session: { id: string; startDate: string | null; endDate: string | null },
  closures: { sessionId: string | null; startDate: string; endDate: string }[],
  dateISO: string,
): boolean {
  if (session.startDate && dateISO < session.startDate) return false
  if (session.endDate && dateISO > session.endDate) return false
  return !closures.some(
    (c) => (c.sessionId === null || c.sessionId === session.id) && dateISO >= c.startDate && dateISO <= c.endDate,
  )
}
