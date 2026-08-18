"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { BackupRecordEntry } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Download, Upload, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminBackup({ backupRecords }: { backupRecords: BackupRecordEntry[] }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [backingUp, setBackingUp] = useState(false)
  const [backupError, setBackupError] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)

  const handleBackup = async () => {
    setBackingUp(true)
    setBackupError(false)
    try {
      const res = await fetch("/api/admin/backup")
      if (!res.ok) throw new Error("backup failed")
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? "agu_backup.sql"
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setBackupError(true)
    } finally {
      setBackingUp(false)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleBackup} disabled={backingUp}>
          <Download className="mr-1.5 h-4 w-4" />
          {backingUp ? t("adm.backup.backing") : t("adm.backup.backup")}
        </Button>
        <Button variant="outline" onClick={() => setRestoreOpen(true)}>
          <Upload className="mr-1.5 h-4 w-4" />
          {t("adm.backup.restore")}
        </Button>
        {backupError && <p className="text-sm text-destructive">{t("adm.backup.backupErr")}</p>}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t("adm.backup.records")}</h3>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adm.backup.col.action")}</TableHead>
                <TableHead>{t("adm.backup.col.filename")}</TableHead>
                <TableHead>{t("adm.backup.col.status")}</TableHead>
                <TableHead>{t("adm.backup.col.by")}</TableHead>
                <TableHead>{t("adm.backup.col.time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {t("adm.backup.empty")}
                  </TableCell>
                </TableRow>
              )}
              {backupRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-card-foreground">
                    {r.action === "backup" ? t("adm.backup.backup") : t("adm.backup.restore")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.filename}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        r.status === "success" ? "bg-chart-5/15 text-chart-5" : "bg-destructive/15 text-destructive",
                      )}
                      title={r.message ?? undefined}
                    >
                      {r.status === "success" ? t("adm.backup.status.success") : t("adm.backup.status.failed")}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.createdBy}</TableCell>
                  <TableCell className="text-muted-foreground">{r.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <RestoreForm onClose={() => setRestoreOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RestoreForm({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(false)

  const handleConfirm = async () => {
    if (!file || isPending) return
    setIsPending(true)
    setError(false)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/restore", { method: "POST", body: formData })
      if (!res.ok) throw new Error("restore failed")
      router.refresh()
      onClose()
    } catch {
      setError(true)
      router.refresh()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("adm.backup.restoreConfirmTitle")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0 translate-y-0.5" />
          <p>{t("adm.backup.restoreWarning")}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            {t("adm.backup.chooseFile")}
          </Button>
          <span className="truncate text-sm text-muted-foreground">
            {file ? file.name : t("adm.backup.noFileChosen")}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{t("adm.backup.restoreErr")}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button variant="destructive" onClick={handleConfirm} disabled={!file || isPending}>
          {isPending ? t("adm.backup.restoring") : t("common.confirm")}
        </Button>
      </DialogFooter>
    </>
  )
}
