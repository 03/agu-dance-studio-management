"use server"

import { Chess } from "chess.js"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { sanitizePgnForParsing } from "@/lib/pgn"
import type { ActionResult } from "@/lib/actions/bookings"

const KNOWN_ERROR_CODES = new Set(["NO_LINKED_STUDENT", "NO_LINKED_TEACHER", "INVALID_PGN", "FORBIDDEN", "NOT_FOUND"])

function errorResult(e: unknown): { ok: false; error: string } {
  const code = e instanceof Error ? e.message : ""
  if (!KNOWN_ERROR_CODES.has(code)) {
    console.error("[game-reviews]", e)
    return { ok: false, error: "UNKNOWN" }
  }
  return { ok: false, error: code }
}

// Student pastes in a PGN of a game played elsewhere (this app never hosts
// live play — see prisma/schema.prisma's GameReview comment). Validated via
// chess.js rather than trusted as-is, since an unparseable PGN would break
// game-viewer.tsx's replay later with no way to explain why.
export async function submitGameReview({ title, pgn }: { title: string; pgn: string }): Promise<ActionResult> {
  const { studentId } = await requireRole("STUDENT")
  if (!studentId) return { ok: false, error: "NO_LINKED_STUDENT" }
  try {
    const chess = new Chess()
    try {
      chess.loadPgn(sanitizePgnForParsing(pgn))
    } catch {
      throw new Error("INVALID_PGN")
    }
    if (chess.history().length === 0) throw new Error("INVALID_PGN")
    const result = chess.header().Result ?? null
    // Stored as the student pasted it (comments and all) — the sanitizing
    // above is only to make chess.js's stricter-than-real-world PGN
    // grammar accept it; game-viewer.tsx re-sanitizes the same way at
    // display time rather than needing a separate "cleaned" copy here.
    await prisma.gameReview.create({
      data: { studentId, title, pgn, result },
    })
    return { ok: true }
  } catch (e) {
    return errorResult(e)
  }
}

// A review is implicitly "picked up" by whichever coach leaves the first
// comment on it — no separate claim step. Only the first commenter sets
// teacherId; later comments from other coaches don't reassign it.
export async function addGameComment(reviewId: string, ply: number, text: string): Promise<ActionResult> {
  const { teacherId } = await requireRole("TEACHER")
  if (!teacherId) return { ok: false, error: "NO_LINKED_TEACHER" }
  try {
    await prisma.$transaction(async (tx) => {
      const review = await tx.gameReview.findUniqueOrThrow({ where: { id: reviewId } })
      await tx.gameComment.create({ data: { reviewId, ply, teacherId, text } })
      if (!review.teacherId) {
        await tx.gameReview.update({ where: { id: reviewId }, data: { teacherId } })
      }
    })
    return { ok: true }
  } catch (e) {
    return errorResult(e)
  }
}
