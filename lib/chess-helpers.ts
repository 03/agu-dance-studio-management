import type { Chess } from "chess.js"

// The square of the king currently in check, or null — a FEN string alone
// doesn't encode check (it's derived from the position, not stored
// state), so this is computed fresh from whichever live Chess instance
// the caller already has, for ChessBoard's `checkSquare` highlight prop.
export function findCheckedKingSquare(chess: Chess): string | null {
  if (!chess.inCheck()) return null
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece?.type === "k" && piece.color === chess.turn()) return piece.square
    }
  }
  return null
}
