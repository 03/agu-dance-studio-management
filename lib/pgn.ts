// chess.js's PGN grammar accepts at most one {…} comment between moves —
// a real lichess/chess.com export routinely has two back-to-back (a
// [%clk] annotation plus a separate opening-name comment, e.g.
// "d5 { [%clk 0:01:00] } { B10 Caro-Kann Defense }"), which makes
// chess.loadPgn() throw even though the move text itself is perfectly
// legal. chess.js only needs the bare move text to replay a game, so the
// fix is to strip all comments/variations/NAGs before parsing rather than
// trying to teach its grammar to accept them — any per-move clock data
// that's needed for display (see extractPlyClocks below) is pulled from
// the ORIGINAL, unsanitized PGN instead.
export function sanitizePgnForParsing(pgn: string): string {
  let out = pgn.replace(/\{[^}]*\}/g, " ")
  // RAV (alternate-line) variations can nest, e.g. "(1. e4 (1. d4) e5)" —
  // strip repeatedly from the innermost pair outward until none remain.
  let prev: string
  do {
    prev = out
    out = out.replace(/\([^()]*\)/g, " ")
  } while (out !== prev)
  return out.replace(/\$\d+/g, " ").replace(/\s+/g, " ").trim()
}

// Per-ply clock reading (lichess/chess.com's "[%clk H:MM:SS]" comment
// annotation — the time left on that side's clock right after the move),
// 0-indexed to line up with chess.js's history()/GameComment.ply. null for
// a ply with no such annotation (most non-lichess/chess.com PGNs, or a
// game exported without clock times).
//
// This can't just call chess.loadPgn() and then chess.getComments() —
// that requires the PGN to parse under chess.js's one-comment-per-move
// grammar, which is exactly what sanitizePgnForParsing works around. So
// this walks the raw movetext itself with a small hand-rolled scanner:
// PGN comments ("{...}") never nest, but RAV variations ("(...)") do, so
// each needs slightly different handling.
export function extractPlyClocks(pgn: string): (string | null)[] {
  // Drop the header block (a run of "[Tag \"value\"]" lines) so a header
  // line's own bracketed content is never mistaken for a comment/variation.
  const movetext = pgn.replace(/^(\s*\[[^\]]*\]\s*)+/, "")

  const clocks: (string | null)[] = []
  let word = ""
  let parenDepth = 0

  const flushWord = () => {
    if (!word) return
    // Some exporters glue the move number onto the move with no space
    // ("12.Nf3") — strip it so what's left is just the SAN move, same as
    // a plain "12." token strips to nothing and is correctly ignored.
    const token = word.replace(/^\d+\.+/, "")
    word = ""
    if (!token || /^\$\d+$/.test(token) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) return
    clocks.push(null) // filled in below if a "{ [%clk ...] }" comment follows
  }

  for (let i = 0; i < movetext.length; i++) {
    const ch = movetext[i]
    if (parenDepth > 0) {
      if (ch === "(") parenDepth++
      else if (ch === ")") parenDepth--
      continue
    }
    if (ch === "(") {
      flushWord()
      parenDepth++
    } else if (ch === "{") {
      flushWord()
      const end = movetext.indexOf("}", i + 1)
      const body = movetext.slice(i + 1, end === -1 ? undefined : end)
      const clk = body.match(/\[%clk\s+([\d:]+)\]/)
      // A move can carry more than one consecutive comment (clock +
      // opening name, say) — keep whichever one actually has a [%clk] tag.
      if (clk && clocks.length > 0 && clocks[clocks.length - 1] == null) {
        clocks[clocks.length - 1] = clk[1]
      }
      i = end === -1 ? movetext.length : end
    } else if (/\s/.test(ch)) {
      flushWord()
    } else {
      word += ch
    }
  }
  flushWord()
  return clocks
}

// "H:MM:SS" or "MM:SS" -> total seconds, or null if unparseable.
function clockToSeconds(clock: string): number | null {
  const parts = clock.split(":").map(Number)
  if (parts.some((n) => Number.isNaN(n))) return null
  return parts.reduce((total, n) => total * 60 + n, 0)
}

// How long a side spent on the move at `ply` (0-indexed, same convention
// as extractPlyClocks) — the difference between that side's clock reading
// after this move and after their previous move. null when either reading
// is missing, or for a side's first move (no prior reading to diff
// against). Ignores any per-move increment, since PGN clock comments don't
// encode the time control — so this is "how much the clock ticked down,"
// a close approximation of time spent rather than an exact figure.
export function plyTimeUsedSeconds(clocks: (string | null)[], ply: number): number | null {
  if (ply < 2) return null
  const current = clocks[ply]
  const previous = clocks[ply - 2]
  if (!current || !previous) return null
  const currentSec = clockToSeconds(current)
  const previousSec = clockToSeconds(previous)
  if (currentSec == null || previousSec == null) return null
  return Math.max(0, previousSec - currentSec)
}

// A whole-number seconds count -> "M:SS" (or "H:MM:SS" past an hour), for
// displaying plyTimeUsedSeconds — deliberately not reusing the "H:MM:SS"
// clock-reading strings themselves, which are a different kind of value
// (a point-in-time reading, not a duration).
export function formatSecondsShort(totalSeconds: number): string {
  const s = Math.round(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  const ss = String(sec).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
