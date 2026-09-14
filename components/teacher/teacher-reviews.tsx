"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { GameReview } from "@/lib/types"
import { addGameComment } from "@/lib/actions/game-reviews"
import { GameViewer } from "@/components/shared/game-viewer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollText, MessageCircle } from "lucide-react"

export function TeacherReviews({ reviews }: { reviews: GameReview[] }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [openReviewId, setOpenReviewId] = useState<string | null>(null)
  // Derived from `reviews` (not a snapshot copied into state) so that once
  // router.refresh() brings back the newly-added comment, the still-open
  // dialog picks it up instead of showing the stale pre-comment list.
  const openReview = reviews.find((r) => r.id === openReviewId) ?? null

  const handleAddComment = async (ply: number, text: string) => {
    if (!openReviewId) return { ok: false, error: "UNKNOWN" }
    const result = await addGameComment(openReviewId, ply, text)
    if (result.ok) router.refresh()
    return result
  }

  return (
    <div>
      <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("tea.reviews.title")}</h1>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {reviews.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("tea.reviews.empty")}</p>
        ) : (
          reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenReviewId(r.id)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <ScrollText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-card-foreground">
                  {r.studentName} · {r.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.createdAt}</p>
              </div>
              {!r.teacherId ? (
                <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                  {t("tea.reviews.unreviewed")}
                </span>
              ) : (
                r.comments.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="size-3.5" />
                    {r.comments.length}
                  </div>
                )
              )}
            </button>
          ))
        )}
      </div>

      <Dialog open={openReview != null} onOpenChange={(open) => !open && setOpenReviewId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {openReview && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {openReview.studentName} · {openReview.title}
                </DialogTitle>
              </DialogHeader>
              <GameViewer pgn={openReview.pgn} comments={openReview.comments} onAddComment={handleAddComment} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
