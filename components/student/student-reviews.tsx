"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { GameReview } from "@/lib/types"
import { submitGameReview } from "@/lib/actions/game-reviews"
import { GameViewer } from "@/components/shared/game-viewer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, ScrollText, MessageCircle, Upload } from "lucide-react"

export function StudentReviews({ reviews }: { reviews: GameReview[] }) {
  const { t } = useLanguage()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [openReview, setOpenReview] = useState<GameReview | null>(null)

  return (
    <div>
      <header className="flex items-center justify-between bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <h1 className="font-display text-xl font-bold">{t("stu.reviews.title")}</h1>
        <Button variant="secondary" size="sm" onClick={() => setUploadOpen(true)}>
          <Plus /> {t("stu.reviews.upload")}
        </Button>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {reviews.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("stu.reviews.empty")}</p>
        ) : (
          reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenReview(r)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <ScrollText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-card-foreground">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.createdAt}
                  {r.teacherName ? ` · ${t("stu.reviews.reviewedBy")}${r.teacherName}` : ` · ${t("stu.reviews.waitingCoach")}`}
                </p>
              </div>
              {r.comments.length > 0 && (
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <MessageCircle className="size-3.5" />
                  {r.comments.length}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <UploadForm onClose={() => setUploadOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openReview != null} onOpenChange={(open) => !open && setOpenReview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {openReview && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{openReview.title}</DialogTitle>
              </DialogHeader>
              <GameViewer pgn={openReview.pgn} comments={openReview.comments} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UploadForm({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [pgn, setPgn] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isValid = title.trim() !== "" && pgn.trim() !== ""

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file later
    if (!file) return
    setError(null)
    file.text().then((text) => {
      setPgn(text)
      // A .pgn file's name is usually a decent default title (e.g.
      // "lichess_pgn_2026.09.10_...") — only fill it in if the student
      // hasn't already typed one, never overwrite.
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""))
    })
  }

  const handleSubmit = () => {
    if (!isValid || isPending) return
    setError(null)
    startTransition(async () => {
      const result = await submitGameReview({ title: title.trim(), pgn })
      if (!result.ok) {
        setError(result.error === "INVALID_PGN" ? "stu.reviews.err.invalidPgn" : "stu.reviews.err.generic")
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("stu.reviews.upload")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("stu.reviews.uploadTitleLabel")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("stu.reviews.uploadTitlePlaceholder")} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>{t("stu.reviews.pgnLabel")}</Label>
            <Button type="button" variant="outline" size="xs" onClick={() => fileInputRef.current?.click()}>
              <Upload /> {t("stu.reviews.uploadFile")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,.txt,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <Textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder={t("stu.reviews.pgnPlaceholder")}
            rows={8}
            className="font-mono text-xs"
          />
        </div>
        {error && <p className="text-sm text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isPending}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}
