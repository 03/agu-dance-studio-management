import { cn } from "@/lib/utils"

// Renders one FEN position with Unicode chess glyphs, file/rank
// coordinates along the edges, and an optional check highlight. Read-only
// by default (post-lesson game review never needs move input — see
// prisma/schema.prisma's GameReview comment) — passing `onSquareClick`
// switches a cell to a clickable square (used by the live "AI 陪练"
// practice board); the click/selection-related props are no-ops without it.
const PIECE_GLYPHS: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
}

const FILES = "abcdefgh"

function expandRow(row: string): (string | null)[] {
  const cells: (string | null)[] = []
  for (const ch of row) {
    if (/\d/.test(ch)) {
      cells.push(...Array(Number(ch)).fill(null))
    } else {
      cells.push(ch)
    }
  }
  return cells
}

const BOARD_INDICES = [0, 1, 2, 3, 4, 5, 6, 7]

export function ChessBoard({
  fen,
  onSquareClick,
  selectedSquare,
  legalTargets,
  lastMove,
  checkSquare,
  flipped,
}: {
  fen: string
  onSquareClick?: (square: string) => void
  selectedSquare?: string | null
  legalTargets?: string[]
  lastMove?: { from: string; to: string } | null
  // The square of whichever king is currently in check — a FEN string
  // alone doesn't encode check (it's derived from the position, not
  // stored state), so callers compute this from their own live Chess
  // instance (see lib/chess-helpers.ts's findCheckedKingSquare).
  checkSquare?: string | null
  // Rotates the board 180° for viewing from Black's side — purely a
  // display concern, every square's algebraic identity (and therefore
  // move logic in ai-practice.tsx) is unaffected either way.
  flipped?: boolean
}) {
  const ranks = fen.split(" ")[0].split("/")
  const rankOrder = flipped ? [...BOARD_INDICES].reverse() : BOARD_INDICES
  const fileOrder = flipped ? [...BOARD_INDICES].reverse() : BOARD_INDICES

  return (
    // Each cell (not the grid as a whole) carries its own aspect-square:
    // the grid's implicit rows are auto-sized, and relying on the grid
    // container's own aspect-ratio to stretch those rows evenly is a known
    // cross-browser weak spot — rows holding a piece glyph and empty rows
    // can end up with different content-driven heights instead of
    // stretching equally. Squaring every cell against the (reliably equal)
    // 1fr column width sidesteps that row-track computation entirely.
    <div className="grid w-full grid-cols-8 overflow-hidden rounded-lg border border-border">
      {rankOrder.map((rankIdx, displayRow) => {
        const cellsInRank = expandRow(ranks[rankIdx])
        return fileOrder.map((fileIdx, displayCol) => {
          const cell = cellsInRank[fileIdx]
          const isLight = (rankIdx + fileIdx) % 2 === 0
          const square = `${FILES[fileIdx]}${8 - rankIdx}`
          const interactive = !!onSquareClick
          const isSelected = interactive && square === selectedSquare
          const isTarget = interactive && !!legalTargets?.includes(square)
          const isLastMove = interactive && (square === lastMove?.from || square === lastMove?.to)
          const isCheck = square === checkSquare
          const Cell = interactive ? "button" : "div"

          return (
            <Cell
              key={`${rankIdx}-${fileIdx}`}
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => onSquareClick!(square) : undefined}
              className={cn(
                "relative flex aspect-square items-center justify-center text-[clamp(16px,5vw,26px)] leading-none",
                isLight ? "bg-secondary" : "bg-card",
                interactive && "cursor-pointer border-0 p-0",
                isLastMove && "after:absolute after:inset-0 after:bg-accent/25 after:content-['']",
                isSelected && "ring-2 ring-inset ring-primary",
              )}
            >
              {isCheck && (
                <span className="pointer-events-none absolute inset-0 rounded-[2px] bg-destructive/60" />
              )}
              {cell && <span className="text-foreground">{PIECE_GLYPHS[cell]}</span>}
              {isTarget && (
                <span
                  className={cn(
                    "pointer-events-none absolute rounded-full",
                    cell ? "inset-1 ring-4 ring-inset ring-primary/50" : "size-1/3 bg-primary/40",
                  )}
                />
              )}
              {displayCol === 0 && (
                <span className="pointer-events-none absolute left-0.5 top-0 text-[8px] font-semibold leading-none text-foreground/40">
                  {8 - rankIdx}
                </span>
              )}
              {displayRow === 7 && (
                <span className="pointer-events-none absolute bottom-0 right-0.5 text-[8px] font-semibold leading-none text-foreground/40">
                  {FILES[fileIdx]}
                </span>
              )}
            </Cell>
          )
        })
      })}
    </div>
  )
}
