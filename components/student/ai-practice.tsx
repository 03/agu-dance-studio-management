"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Chess, type Square } from "chess.js"
import { Loader2, FlipVertical } from "lucide-react"
import { ChessBoard } from "@/components/shared/chess-board"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { initEngine, getBestMove, terminateEngine, setElo, DEFAULT_ELO } from "@/lib/stockfish-client"
import { findCheckedKingSquare } from "@/lib/chess-helpers"
import { submitGameReview } from "@/lib/actions/game-reviews"

const MOVETIME_MS = 1500
type Side = "w" | "b"
type Outcome = "youWon" | "youLost" | "draw" | "resigned" | null
type Promotion = "q" | "r" | "b" | "n"

const PROMOTION_PIECES: { value: Promotion; glyph: string }[] = [
  { value: "q", glyph: "♛" },
  { value: "r", glyph: "♜" },
  { value: "b", glyph: "♝" },
  { value: "n", glyph: "♞" },
]

// A curated subset of Stockfish's full 1320-3190 UCI_Elo range — enough
// spread for a beginner through a title-level opponent without turning
// the pre-game screen into a fiddly slider. DEFAULT_ELO (2200) is
// pre-selected, matching the coach persona's own rating.
const ELO_PRESETS = [1400, 1800, 2200, 2600, 3000]

export function AiPractice() {
  const { t } = useLanguage()
  const router = useRouter()
  const chessRef = useRef(new Chess())
  // Guards a late-resolving getBestMove() from applying a move after the
  // game already ended some other way (resignation, or the student
  // clicking "再来一局") while the engine was still thinking.
  const endedRef = useRef(false)
  // Authoritative side-in-play for logic that can run inside an async
  // callback (requestAiMove/applyMove) — `side` state alone would be stale
  // in requestAiMove when it's kicked off synchronously from startGame,
  // before the setSide(chosenSide) that triggered it has actually
  // committed to a new render.
  const sideRef = useRef<Side | null>(null)

  const [engineError, setEngineError] = useState(false)
  const [elo, setEloChoice] = useState(DEFAULT_ELO)
  const [configuring, setConfiguring] = useState(false)
  const [side, setSide] = useState<Side | null>(null)
  const [boardFlipped, setBoardFlipped] = useState(false)
  const [fen, setFen] = useState(chessRef.current.fen())
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [legalTargets, setLegalTargets] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [thinking, setThinking] = useState(false)
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null)
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    initEngine().catch(() => setEngineError(true))
    return () => terminateEngine()
  }, [])

  const resetGame = () => {
    chessRef.current = new Chess()
    endedRef.current = false
    sideRef.current = null
    setSide(null)
    setBoardFlipped(false)
    setFen(chessRef.current.fen())
    setSelectedSquare(null)
    setLegalTargets([])
    setLastMove(null)
    setThinking(false)
    setConfiguring(false)
    setPromotionPending(null)
    setOutcome(null)
    setSaving(false)
    setSaved(false)
    setSaveError(null)
  }

  const endGame = (result: Outcome) => {
    endedRef.current = true
    setThinking(false)
    setOutcome(result)
  }

  const requestAiMove = () => {
    setThinking(true)
    getBestMove(chessRef.current.fen(), MOVETIME_MS)
      .then((mv) => {
        if (endedRef.current) return
        chessRef.current.move({ from: mv.from, to: mv.to, promotion: mv.promotion })
        setLastMove({ from: mv.from, to: mv.to })
        setFen(chessRef.current.fen())
        setThinking(false)
        if (chessRef.current.isGameOver()) {
          endGame(outcomeFor(chessRef.current, sideRef.current!))
        }
      })
      .catch(() => {
        if (!endedRef.current) setEngineError(true)
        setThinking(false)
      })
  }

  const startGame = (chosenSide: Side) => {
    sideRef.current = chosenSide
    setSide(chosenSide)
    // Sensible default (your own pieces at the bottom) — the flip button
    // during the game still lets the student override it either way.
    setBoardFlipped(chosenSide === "b")
    // Block the board (and the auto black-move below) until the engine has
    // actually acknowledged the chosen rating — getBestMove doesn't wait
    // on this itself, and the worker only has one in-flight UCI exchange
    // at a time, so firing a move request while setElo's own isready/
    // readyok round-trip is still pending would race with it.
    setConfiguring(true)
    setElo(elo)
      .then(() => {
        setConfiguring(false)
        if (chosenSide === "b") requestAiMove()
      })
      .catch(() => setEngineError(true))
  }

  const applyMove = (from: string, to: string, promotion?: Promotion) => {
    chessRef.current.move({ from, to, promotion })
    setSelectedSquare(null)
    setLegalTargets([])
    setLastMove({ from, to })
    setFen(chessRef.current.fen())
    setPromotionPending(null)
    if (chessRef.current.isGameOver()) {
      endGame(outcomeFor(chessRef.current, sideRef.current!))
      return
    }
    requestAiMove()
  }

  const handleSquareClick = (square: string) => {
    if (thinking || configuring || outcome || !side || chessRef.current.turn() !== side) return
    if (selectedSquare) {
      if (square === selectedSquare) {
        setSelectedSquare(null)
        setLegalTargets([])
        return
      }
      if (legalTargets.includes(square)) {
        const verbose = chessRef.current.moves({ square: selectedSquare as Square, verbose: true })
        const needsPromotion = verbose.some((m) => m.to === square && m.promotion)
        if (needsPromotion) {
          setPromotionPending({ from: selectedSquare, to: square })
          return
        }
        applyMove(selectedSquare, square)
        return
      }
    }
    const piece = chessRef.current.get(square as Square)
    if (piece && piece.color === side) {
      const verbose = chessRef.current.moves({ square: square as Square, verbose: true })
      setSelectedSquare(square)
      setLegalTargets(verbose.map((m) => m.to))
    } else {
      setSelectedSquare(null)
      setLegalTargets([])
    }
  }

  const handleUndo = () => {
    if (thinking || configuring || outcome || chessRef.current.history().length < 2) return
    chessRef.current.undo()
    chessRef.current.undo()
    setFen(chessRef.current.fen())
    setLastMove(null)
    setSelectedSquare(null)
    setLegalTargets([])
  }

  const handleResign = () => {
    setResignConfirmOpen(false)
    endGame("resigned")
  }

  const handleSaveToReview = () => {
    if (saving || !side) return
    setSaving(true)
    setSaveError(null)
    const resultTag =
      outcome === "resigned" || outcome === "youLost"
        ? side === "w" ? "0-1" : "1-0"
        : outcome === "youWon"
          ? side === "w" ? "1-0" : "0-1"
          : "1/2-1/2"
    const engineName = `Stockfish (${elo})`
    chessRef.current.header(
      "White", side === "w" ? "学员" : engineName,
      "Black", side === "b" ? "学员" : engineName,
      "Result", resultTag,
    )
    const title = `AI 陪练 · ${side === "w" ? t("stu.ai.playWhite") : t("stu.ai.playBlack")} · ${elo} · ${new Date().toISOString().slice(0, 10)}`
    submitGameReview({ title, pgn: chessRef.current.pgn() }).then((result) => {
      setSaving(false)
      if (result.ok) {
        setSaved(true)
        router.refresh()
      } else {
        setSaveError(result.error)
      }
    })
  }

  if (!side) {
    return (
      <div>
        <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
          <h1 className="font-display text-xl font-bold">{t("stu.ai.title")}</h1>
        </header>
        <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("stu.ai.intro")}</p>
          {engineError ? (
            <p className="text-sm text-destructive">{t("stu.ai.engineError")}</p>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">{t("stu.ai.ratingLabel")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {ELO_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      variant={elo === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEloChoice(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button disabled={configuring} onClick={() => startGame("w")}>
                  {t("stu.ai.playWhite")}
                </Button>
                <Button variant="outline" disabled={configuring} onClick={() => startGame("b")}>
                  {t("stu.ai.playBlack")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const moves = chessRef.current.history()
  const checkSquare = findCheckedKingSquare(chessRef.current)

  return (
    <div>
      <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("stu.ai.title")}</h1>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex justify-end">
          <Button variant="ghost" size="icon-sm" aria-label={t("common.flipBoard")} onClick={() => setBoardFlipped((f) => !f)}>
            <FlipVertical />
          </Button>
        </div>

        <ChessBoard
          fen={fen}
          onSquareClick={handleSquareClick}
          selectedSquare={selectedSquare}
          legalTargets={legalTargets}
          lastMove={lastMove}
          checkSquare={checkSquare}
          flipped={boardFlipped}
        />

        <div className="flex h-5 items-center justify-center gap-1.5 text-sm text-muted-foreground">
          {(thinking || configuring) && (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {configuring ? t("stu.ai.engineLoading") : t("stu.ai.thinking")}
            </>
          )}
        </div>

        {!outcome && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={thinking || configuring || moves.length < 2} onClick={handleUndo}>
              {t("stu.ai.undo")}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setResignConfirmOpen(true)}>
              {t("stu.ai.resign")}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-2">
          {moves.map((san, i) => (
            <span key={i} className="rounded px-1.5 py-0.5 text-xs font-medium text-foreground">
              {i % 2 === 0 ? `${i / 2 + 1}.` : ""}
              {san}
            </span>
          ))}
        </div>

        {outcome && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4 text-center">
            <p className="font-display text-lg font-bold text-card-foreground">
              {t(`stu.ai.result.${outcome}`)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={resetGame}>
                {t("stu.ai.newGame")}
              </Button>
              <Button onClick={handleSaveToReview} disabled={saving || saved}>
                {saved ? t("stu.ai.saveSuccess") : t("stu.ai.saveToReview")}
              </Button>
            </div>
            {saveError && <p className="text-xs text-destructive">{t("stu.reviews.err.generic")}</p>}
          </div>
        )}
      </div>

      <Dialog open={promotionPending != null} onOpenChange={(open) => !open && setPromotionPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{t("stu.ai.promoteTo")}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-2">
            {PROMOTION_PIECES.map((p) => (
              <Button
                key={p.value}
                variant="outline"
                size="icon-lg"
                className="text-2xl"
                onClick={() => promotionPending && applyMove(promotionPending.from, promotionPending.to, p.value)}
              >
                {p.glyph}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resignConfirmOpen} onOpenChange={setResignConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{t("stu.ai.confirmResign")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResignConfirmOpen(false)}>
              {t("common.close")}
            </Button>
            <Button variant="destructive" onClick={handleResign}>
              {t("stu.ai.resign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function outcomeFor(chess: Chess, side: Side): Outcome {
  if (chess.isDraw() || chess.isStalemate()) return "draw"
  if (chess.isCheckmate()) {
    // The side whose turn it now is has no legal moves — they're the one
    // checkmated (chess.js flips `turn()` after every move, including the
    // final mating one), so this checks who's "on move" in the now-frozen
    // final position, not who just moved.
    const loser = chess.turn()
    return loser === side ? "youLost" : "youWon"
  }
  return "draw"
}
