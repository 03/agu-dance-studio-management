// ClassSession.day is a recurring weekly slot (0=Mon..6=Sun), not tied to a
// specific calendar date — these helpers convert between the two so the UI
// can show a real, always-current date instead of a stale stored label.

export function toAppDay(d: Date): number {
  const jsDay = d.getDay() // 0 = Sun ... 6 = Sat
  return jsDay === 0 ? 6 : jsDay - 1
}

export function formatAppDate(d: Date): string {
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`
}

// The next real calendar date this recurring weekday slot falls on,
// counting today itself if it matches (0-6 days out).
export function nextOccurrence(day: number, from = new Date()): Date {
  const base = new Date(from)
  base.setHours(0, 0, 0, 0)
  let diff = day - toAppDay(base)
  if (diff < 0) diff += 7
  const result = new Date(base)
  result.setDate(base.getDate() + diff)
  return result
}

// Bookings are scoped to one specific calendar occurrence of a recurring
// session (see Booking.date in schema.prisma). These pair up to move that
// date across the client/server boundary without the classic
// `new Date("YYYY-MM-DD")` bug — that parses as UTC midnight, which can
// silently shift a day depending on the reader's local timezone offset.
// Always go through toISODate/parseISODate together, never bare Date(iso).
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Lookup key for a (session, occurrence date) pair — same key on client and
// server so Occurrence data fetched separately from ClassSession templates
// can be joined by simple map lookup.
export function occurrenceKey(sessionId: string, date: Date | string): string {
  const iso = typeof date === "string" ? date : toISODate(date)
  return `${sessionId}__${iso}`
}
