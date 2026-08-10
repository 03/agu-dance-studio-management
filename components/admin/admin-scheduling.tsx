"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import {
  sessions as initialSessions,
  teachers,
  rooms,
  weekdayKeys,
  styleColors,
  type ClassSession,
} from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, Ban } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminScheduling() {
  const { t, lang } = useLanguage()
  const [sessions, setSessions] = useState<ClassSession[]>(
    initialSessions.map((s) => ({ ...s, status: "normal" })),
  )
  const [editing, setEditing] = useState<ClassSession | null>(null)

  const teacherName = (id: string) =>
    lang === "zh" ? teachers.find((x) => x.id === id)?.name : teachers.find((x) => x.id === id)?.nameEn
  const roomName = (id: string) =>
    lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn

  const saveEdit = (updated: ClassSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setEditing(null)
  }
  const cancelClass = (id: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "canceled" } : s)))
    setEditing(null)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("adm.schedule.weekly")}</p>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("adm.schedule.add")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <div className="grid min-w-[900px] grid-cols-7">
          {weekdayKeys.map((wk, day) => (
            <div key={wk} className={cn("min-h-[420px] p-2", day !== 6 && "border-r border-border")}>
              <div className="mb-2 rounded-lg bg-secondary py-1.5 text-center text-xs font-semibold text-secondary-foreground">
                {t(wk)}
              </div>
              <div className="flex flex-col gap-2">
                {sessions
                  .filter((s) => s.day === day)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setEditing(s)}
                      className={cn(
                        "rounded-xl border-l-4 bg-secondary/40 p-2 text-left transition-colors hover:bg-secondary",
                        s.status === "canceled" && "opacity-40",
                      )}
                      style={{ borderLeftColor: styleColors[s.style] }}
                    >
                      <p className="text-[11px] font-semibold text-card-foreground">{s.start}</p>
                      <p className={cn("text-xs font-bold text-card-foreground", s.status === "canceled" && "line-through")}>
                        {t(s.style)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{teacherName(s.teacherId)}</p>
                      <p className="text-[11px] text-muted-foreground">{roomName(s.roomId)}</p>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Single session editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <EditForm
              key={editing.id}
              session={editing}
              onSave={saveEdit}
              onCancelClass={() => cancelClass(editing.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditForm({
  session,
  onSave,
  onCancelClass,
}: {
  session: ClassSession
  onSave: (s: ClassSession) => void
  onCancelClass: () => void
}) {
  const { t, lang } = useLanguage()
  const [teacherId, setTeacherId] = useState(session.teacherId)
  const [roomId, setRoomId] = useState(session.roomId)
  const [start, setStart] = useState(session.start)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {t("adm.schedule.editSingle")} · {t(session.style)}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("adm.schedule.swapTeacher")}</Label>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((tc) => (
                <SelectItem key={tc.id} value={tc.id}>
                  {lang === "zh" ? tc.name : tc.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>{t("adm.schedule.swapRoom")}</Label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {lang === "zh" ? r.name : r.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>{t("common.time")}</Label>
          <Input value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onCancelClass}>
          <Ban className="mr-1.5 h-4 w-4" />
          {t("adm.schedule.cancelClass")}
        </Button>
        <Button onClick={() => onSave({ ...session, teacherId, roomId, start })}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}
