"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { Studio } from "@/lib/types"
import { createStudio, updateStudio, deleteStudio, type StudioInput } from "@/lib/actions/studios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Pencil, Trash2 } from "lucide-react"

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; studio: Studio }
  | { mode: "delete"; studio: Studio }
  | null

const ERROR_KEY: Record<string, string> = {
  INVALID_NAME: "adm.studios.err.invalidName",
  INVALID_NAME_EN: "adm.studios.err.invalidNameEn",
  STUDIO_IN_USE: "adm.studios.err.inUse",
}
const errorKeyFor = (e: unknown) => ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

export function AdminStudios({ studios }: { studios: Studio[] }) {
  const { t } = useLanguage()
  const [dialog, setDialog] = useState<DialogState>(null)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground">
          {t("adm.nav.studios")}:{" "}
          <span className="font-display font-bold text-foreground">{studios.length}</span>
        </span>
        <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("adm.studios.add")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("adm.studios.code")}</TableHead>
              <TableHead>{t("adm.studios.name")}</TableHead>
              <TableHead>{t("adm.studios.address")}</TableHead>
              <TableHead>{t("adm.studios.postalCode")}</TableHead>
              <TableHead>{t("common.notes")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studios.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-muted-foreground">{s.code ?? "—"}</TableCell>
                <TableCell className="font-medium text-card-foreground">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.address ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.postalCode ?? "—"}</TableCell>
                <TableCell className="max-w-[16rem] truncate text-muted-foreground" title={s.notes ?? undefined}>
                  {s.notes ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <IconBtn label={t("common.edit")} onClick={() => setDialog({ mode: "edit", studio: s })}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("common.delete")} onClick={() => setDialog({ mode: "delete", studio: s })}>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          {dialog?.mode === "create" && <StudioForm onClose={() => setDialog(null)} />}
          {dialog?.mode === "edit" && (
            <StudioForm key={dialog.studio.id} studio={dialog.studio} onClose={() => setDialog(null)} />
          )}
          {dialog?.mode === "delete" && (
            <DeleteStudioConfirm key={dialog.studio.id} studio={dialog.studio} onClose={() => setDialog(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onClick} title={label}>
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  )
}

function StudioForm({ studio, onClose }: { studio?: Studio; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState(studio?.code ?? "")
  const [name, setName] = useState(studio?.name ?? "")
  const [nameEn, setNameEn] = useState(studio?.nameEn ?? "")
  const [address, setAddress] = useState(studio?.address ?? "")
  const [postalCode, setPostalCode] = useState(studio?.postalCode ?? "")
  const [notes, setNotes] = useState(studio?.notes ?? "")
  const [error, setError] = useState<string | null>(null)

  const isValid = name.trim() !== "" && nameEn.trim() !== ""

  const handleConfirm = () => {
    if (!isValid || isPending) return
    setError(null)
    const input: StudioInput = { code, name, nameEn, address, postalCode, notes }
    startTransition(async () => {
      try {
        if (studio) {
          await updateStudio(studio.id, input)
        } else {
          await createStudio(input)
        }
        router.refresh()
        onClose()
      } catch (e) {
        setError(errorKeyFor(e))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {studio ? `${t("common.edit")} · ${studio.name}` : t("adm.studios.add")}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.studios.code")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.studios.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.studios.nameEn")}</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.studios.postalCode")}</Label>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t("adm.studios.address")}</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{t("common.notes")}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid || isPending}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}

function DeleteStudioConfirm({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await deleteStudio(studio.id)
        router.refresh()
        onClose()
      } catch (e) {
        setError(errorKeyFor(e))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {t("common.delete")} · {studio.name}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">{t("adm.studios.deleteDesc")}</p>
        {error && <p className="text-sm text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
          {t("common.delete")}
        </Button>
      </DialogFooter>
    </>
  )
}
