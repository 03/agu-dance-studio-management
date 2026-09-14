// Pure presentational, read-only board — renders one FEN position with
// Unicode chess glyphs. No drag-and-drop, no move legality: this app never
// hosts live play (see prisma/schema.prisma's GameReview comment), it only
// replays a PGN played elsewhere for a coach to annotate.
const PIECE_GLYPHS: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
}

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

export function ChessBoard({ fen }: { fen: string }) {
  const ranks = fen.split(" ")[0].split("/")

  return (
    // Each cell (not the grid as a whole) carries its own aspect-square:
    // the grid's implicit rows are auto-sized, and relying on the grid
    // container's own aspect-ratio to stretch those rows evenly is a known
    // cross-browser weak spot — rows holding a piece glyph and empty rows
    // can end up with different content-driven heights instead of
    // stretching equally. Squaring every cell against the (reliably equal)
    // 1fr column width sidesteps that row-track computation entirely.
    <div className="grid w-full grid-cols-8 overflow-hidden rounded-lg border border-border">
      {ranks.map((row, rankIdx) =>
        expandRow(row).map((cell, fileIdx) => {
          const isLight = (rankIdx + fileIdx) % 2 === 0
          return (
            <div
              key={`${rankIdx}-${fileIdx}`}
              className={`flex aspect-square items-center justify-center text-[clamp(16px,5vw,26px)] leading-none ${
                isLight ? "bg-secondary" : "bg-card"
              }`}
            >
              {cell && <span className="text-foreground">{PIECE_GLYPHS[cell]}</span>}
            </div>
          )
        }),
      )}
    </div>
  )
}
