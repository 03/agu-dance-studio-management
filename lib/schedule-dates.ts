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
