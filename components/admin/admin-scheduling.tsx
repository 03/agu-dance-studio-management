"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, styleColors, type ClassSession, type StyleKey, type Teacher, type Room } from "@/lib/types"
import { createClassSession, updateClassSession, cancelClassSession } from "@/lib/actions/scheduling"
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

export function AdminScheduling({
  teachers,
  rooms,
  sessions,
}: {
  teachers: Teacher[]
  rooms: Room[]
  sessions: ClassSession[]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<ClassSession | null>(null)
  const [adding, setAdding] = useState(false)

  const teacherName = (id: string) =>
    lang === "zh" ? teachers.find((x) => x.id === id)?.name : teachers.find((x) => x.id === id)?.nameEn
  const roomName = (id: string) =>
    lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn

  const saveEdit = (updated: { id: string; teacherId: string; roomId: string; start: string }) => {
    startTransition(async () => {
      await updateClassSession(updated.id, updated)
      router.refresh()
      setEditing(null)
    })
  }
  const cancelClass = (id: string) => {
    startTransition(async () => {
      await cancelClassSession(id)
      router.refresh()
      setEditing(null)
    })
  }
  const addClass = (input: Parameters<typeof createClassSession>[0]) => {
    startTransition(async () => {
      await createClassSession(input)
      router.refresh()
      setAdding(false)
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("adm.schedule.weekly")}</p>
        <Button size="sm" onClick={() => setAdding(true)}>
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
              teachers={teachers}
              rooms={rooms}
              pending={isPending}
              onSave={saveEdit}
              onCancelClass={() => cancelClass(editing.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add new session */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <AddForm
            teachers={teachers}
            rooms={rooms}
            pending={isPending}
            onAdd={addClass}
            onCancel={() => setAdding(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

const styleKeys = Object.keys(styleColors) as StyleKey[]

function AddForm({
  teachers,
  rooms,
  pending,
  onAdd,
  onCancel,
}: {
  teachers: Teacher[]
  rooms: Room[]
  pending: boolean
  onAdd: (input: Parameters<typeof createClassSession>[0]) => void
  onCancel: () => void
}) {
  const { t, lang } = useLanguage()
  const [style, setStyle] = useState<StyleKey>(styleKeys[0])
  const [teacherId, setTeacherId] = useState(teachers[0].id)
  const [roomId, setRoomId] = useState(rooms[0].id)
  const [day, setDay] = useState("0")
  const teacherLabel = (id: string) => (lang === "zh" ? teachers.find((x) => x.id === id)?.name : teachers.find((x) => x.id === id)?.nameEn)
  const roomLabel = (id: string) => (lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn)
  const [date, setDate] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [capacity, setCapacity] = useState("12")
  const [levelZh, setLevelZh] = useState("")
  const [levelEn, setLevelEn] = useState("")

  const capacityNum = Number.parseInt(capacity, 10)
  const isValid =
    date.trim() !== "" &&
    start.trim() !== "" &&
    end.trim() !== "" &&
    levelZh.trim() !== "" &&
    levelEn.trim() !== "" &&
    Number.isFinite(capacityNum) &&
    capacityNum > 0

  const handleAdd = () => {
    if (!isValid) return
    onAdd({
      style,
      teacherId,
      roomId,
      day: Number.parseInt(day, 10),
      date: date.trim(),
      start: start.trim(),
      end: end.trim(),
      capacity: capacityNum,
      levelZh: levelZh.trim(),
      levelEn: levelEn.trim(),
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("adm.schedule.add")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("stu.filter.style")}</Label>
          <Select value={style} onValueChange={(v) => setStyle(v as StyleKey)}>
            <SelectTrigger>
              <SelectValue>{(v: StyleKey) => t(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {styleKeys.map((sk) => (
                <SelectItem key={sk} value={sk}>
                  {t(sk)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.schedule.swapTeacher")}</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue>{teacherLabel}</SelectValue>
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
                <SelectValue>{roomLabel}</SelectValue>
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.schedule.day")}</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger>
                <SelectValue>{(v: string) => t(weekdayKeys[Number(v)])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {weekdayKeys.map((wk, i) => (
                  <SelectItem key={wk} value={String(i)}>
                    {t(wk)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("common.date")}</Label>
            <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="12.09" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.schedule.startTime")}</Label>
            <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="19:00" />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.schedule.endTime")}</Label>
            <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="20:00" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t("adm.schedule.capacity")}</Label>
          <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.schedule.level")} (中文)</Label>
            <Input value={levelZh} onChange={(e) => setLevelZh(e.target.value)} placeholder="初级" />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.schedule.level")} (English)</Label>
            <Input value={levelEn} onChange={(e) => setLevelEn(e.target.value)} placeholder="Beginner" />
          </div>
        </div>
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleAdd} disabled={!isValid || pending}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}

function EditForm({
  session,
  teachers,
  rooms,
  pending,
  onSave,
  onCancelClass,
}: {
  session: ClassSession
  teachers: Teacher[]
  rooms: Room[]
  pending: boolean
  onSave: (s: { id: string; teacherId: string; roomId: string; start: string }) => void
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
              <SelectValue>
                {(v: string) => (lang === "zh" ? teachers.find((x) => x.id === v)?.name : teachers.find((x) => x.id === v)?.nameEn)}
              </SelectValue>
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
              <SelectValue>
                {(v: string) => (lang === "zh" ? rooms.find((x) => x.id === v)?.name : rooms.find((x) => x.id === v)?.nameEn)}
              </SelectValue>
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
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onCancelClass}
          disabled={pending}
        >
          <Ban className="mr-1.5 h-4 w-4" />
          {t("adm.schedule.cancelClass")}
        </Button>
        <Button onClick={() => onSave({ id: session.id, teacherId, roomId, start })} disabled={pending}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}
