"use client"

import { useMemo, useState } from "react"
import { Chess } from "chess.js"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ChessBoard } from "@/components/shared/chess-board"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/i18n"
import { sanitizePgnForParsing, extractPlyClocks, plyTimeUsedSeconds, formatSecondsShort } from "@/lib/pgn"
import type { GameComment } from "@/lib/types"

// Replays a PGN's SAN move list once client-side and caches the FEN after
// every ply — positions[0] is the starting position, positions[i] (i >= 1)
// is the position right after moves[i - 1]. A comment's `ply` (schema:
// GameComment.ply) is that same 0-indexed move-array index, so it lines up
// with positions[ply + 1] without any further translation.
function replayPgn(pgn: string): { moves: string[]; positions: string[] } | null {
  try {
    const chess = new Chess()
    chess.loadPgn(sanitizePgnForParsing(pgn))
    const moves = chess.history()
    const replay = new Chess()
    const positions = [replay.fen()]
    for (const san of moves) {
      replay.move(san)
      positions.push(replay.fen())
    }
    return { moves, positions }
  } catch {
    return null
  }
}

export function GameViewer({
  pgn,
  comments,
  onAddComment,
}: {
  pgn: string
  comments: GameComment[]
  onAddComment?: (ply: number, text: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const { t } = useLanguage()
  const replay = useMemo(() => replayPgn(pgn), [pgn])
  const clocks = useMemo(() => extractPlyClocks(pgn), [pgn])
  const [idx, setIdx] = useState(0) // index into positions; 0 = starting position
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (!replay) {
    return <p className="py-6 text-center text-sm text-destructive">{t("stu.reviews.err.invalidPgn")}</p>
  }

  const { moves, positions } = replay
  const currentPly = idx - 1 // the move (0-indexed) that led to the current position, or -1 at the start
  const commentsHere = comments.filter((c) => c.ply === currentPly)
  const pliesWithComments = new Set(comments.map((c) => c.ply))

  const handleSubmit = () => {
    if (!onAddComment || !draft.trim() || currentPly < 0 || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    onAddComment(currentPly, draft.trim()).then((result) => {
      setSubmitting(false)
      if (result.ok) {
        setDraft("")
      } else {
        setSubmitError(result.error ?? "UNKNOWN")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <ChessBoard fen={positions[idx]} />

      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon-sm" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
          <ChevronLeft />
        </Button>
        <p className="min-w-[6rem] text-center text-sm text-muted-foreground">
          {idx === 0 ? t("review.startPosition") : `${Math.ceil(idx / 2)}. ${idx % 2 === 1 ? "" : "…"}${moves[idx - 1]}`}
        </p>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={idx === moves.length}
          onClick={() => setIdx((i) => Math.min(moves.length, i + 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {idx > 0 && clocks[idx - 1] && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          {(() => {
            const used = plyTimeUsedSeconds(clocks, idx - 1)
            return used != null ? `${t("review.timeUsed")} ${formatSecondsShort(used)} · ` : ""
          })()}
          {t("review.clockRemaining")} {clocks[idx - 1]}
        </p>
      )}

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-2">
        {moves.map((san, i) => (
          <button
            key={i}
            onClick={() => setIdx(i + 1)}
            className={`relative rounded px-1.5 py-0.5 text-xs font-medium ${
              idx === i + 1 ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            {i % 2 === 0 ? `${i / 2 + 1}.` : ""}
            {san}
            {pliesWithComments.has(i) && (
              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("review.comments")}</p>
        {commentsHere.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("review.noComments")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {commentsHere.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium text-card-foreground">{c.teacherName}</span>
                <span className="ml-2 text-xs text-muted-foreground">{c.createdAt}</span>
                <p className="mt-0.5 text-card-foreground">{c.text}</p>
              </li>
            ))}
          </ul>
        )}

        {onAddComment && currentPly >= 0 && (
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("tea.reviews.commentPlaceholder")}
              rows={2}
            />
            {submitError && <p className="text-xs text-destructive">{t("stu.reviews.err.generic")}</p>}
            <Button size="sm" disabled={!draft.trim() || submitting} onClick={handleSubmit} className="self-end">
              {t("tea.reviews.submitComment")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
