// Shared between the QR-generating side (student-profile.tsx) and the
// QR-scanning side (roll-call.tsx + lib/actions/rollcall.ts) so both agree
// on the exact same wire format without duplicating the prefix string.
// The prefix exists purely so a scan of some unrelated QR code (a menu, a
// wifi password, ...) fails fast with a clear "not a check-in code" error
// instead of an opaque "student not found".
const CHECKIN_PREFIX = "agu-checkin:"

export function encodeCheckInPayload(code: string): string {
  return `${CHECKIN_PREFIX}${code}`
}

// Returns null if the scanned text isn't one of ours.
export function decodeCheckInPayload(payload: string): string | null {
  if (!payload.startsWith(CHECKIN_PREFIX)) return null
  const code = payload.slice(CHECKIN_PREFIX.length).trim()
  return code || null
}
