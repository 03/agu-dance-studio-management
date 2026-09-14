"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { weekdayKeys, categoryColors, type ClassSession, type ClassClosure, type CategoryKey, type Teacher, type Room, type Studio } from "@/lib/types"
import { toAppDay } from "@/lib/schedule-dates"
import {
  createClassSession,
  updateClassSession,
  cancelClassSession,
  createClassClosure,
  deleteClassClosure,
} from "@/lib/actions/scheduling"
import { createStudio, updateStudio, deleteStudio, type StudioInput } from "@/lib/actions/studios"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Ban, Pencil, Trash2, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { PeriodBadge } from "@/components/shared/period-badge"

export function AdminScheduling({
  teachers,
  rooms,
  sessions,
  studios,
  closures,
}: {
  teachers: Teacher[]
  rooms: Room[]
  sessions: ClassSession[]
  studios: Studio[]
  closures: ClassClosure[]
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

  const saveEdit = (updated: { id: string } & Parameters<typeof updateClassSession>[1]) => {
    startTransition(async () => {
      const { id, ...input } = updated
      await updateClassSession(id, input)
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
                      style={{ borderLeftColor: categoryColors[s.category] }}
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-semibold text-card-foreground">{s.start}</p>
                        <PeriodBadge start={s.start} />
                        {s.kind === "tournament" && <Trophy className="h-3 w-3 shrink-0 text-primary" />}
                      </div>
                      <p className={cn("text-xs font-bold text-card-foreground", s.status === "canceled" && "line-through")}>
                        {t(s.category)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lang === "zh" ? s.level.zh : s.level.en}
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

      <div className="mt-8">
        <ClosuresSection closures={closures} sessions={sessions} teachers={teachers} />
      </div>

      <div className="mt-8">
        <StudiosSection studios={studios} />
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

const categoryKeys = Object.keys(categoryColors) as CategoryKey[]

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
  const [category, setCategory] = useState<CategoryKey>(categoryKeys[0])
  const [kind, setKind] = useState<"regular" | "tournament">("regular")
  const [teacherId, setTeacherId] = useState(teachers[0].id)
  const [roomId, setRoomId] = useState(rooms[0].id)
  const [day, setDay] = useState("0")
  const [tournamentDate, setTournamentDate] = useState("")
  const teacherLabel = (id: string) => (lang === "zh" ? teachers.find((x) => x.id === id)?.name : teachers.find((x) => x.id === id)?.nameEn)
  const roomLabel = (id: string) => (lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [capacity, setCapacity] = useState("12")
  const [levelZh, setLevelZh] = useState("")
  const [levelEn, setLevelEn] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const capacityNum = Number.parseInt(capacity, 10)
  const isValid =
    start.trim() !== "" &&
    end.trim() !== "" &&
    levelZh.trim() !== "" &&
    levelEn.trim() !== "" &&
    Number.isFinite(capacityNum) &&
    capacityNum > 0 &&
    (kind === "regular" || tournamentDate !== "")

  const handleAdd = () => {
    if (!isValid) return
    // A tournament is a one-off event, not a weekly slot — startDate ==
    // endDate == that single date makes isSessionActiveOn (schedule-dates.ts)
    // active on exactly that day and never again, with zero other new logic.
    const resolvedDay = kind === "tournament" ? toAppDay(new Date(tournamentDate)) : Number.parseInt(day, 10)
    onAdd({
      category,
      kind,
      teacherId,
      roomId,
      day: resolvedDay,
      start: start.trim(),
      end: end.trim(),
      capacity: capacityNum,
      levelZh: levelZh.trim(),
      levelEn: levelEn.trim(),
      startDate: kind === "tournament" ? tournamentDate : startDate || null,
      endDate: kind === "tournament" ? tournamentDate : endDate || null,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("adm.schedule.add")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("stu.filter.category")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
              <SelectTrigger>
                <SelectValue>{(v: CategoryKey) => t(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryKeys.map((ck) => (
                  <SelectItem key={ck} value={ck}>
                    {t(ck)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.schedule.kind")}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "regular" | "tournament")}>
              <SelectTrigger>
                <SelectValue>{(v: "regular" | "tournament") => t(v === "tournament" ? "session.kind.tournament" : "session.kind.regular")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">{t("session.kind.regular")}</SelectItem>
                <SelectItem value="tournament">{t("session.kind.tournament")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        {kind === "tournament" ? (
          <div className="grid gap-2">
            <Label>{t("adm.schedule.tournamentDate")}</Label>
            <Input type="date" value={tournamentDate} onChange={(e) => setTournamentDate(e.target.value)} />
          </div>
        ) : (
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
        )}
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
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.schedule.validFrom")}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.schedule.validTo")}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{t("adm.schedule.validityHint")}</p>
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
  onSave: (s: { id: string } & Parameters<typeof updateClassSession>[1]) => void
  onCancelClass: () => void
}) {
  const { t, lang } = useLanguage()
  const [category, setCategory] = useState<CategoryKey>(session.category)
  const [kind, setKind] = useState<"regular" | "tournament">(session.kind)
  const [teacherId, setTeacherId] = useState(session.teacherId)
  const [roomId, setRoomId] = useState(session.roomId)
  const [day, setDay] = useState(String(session.day))
  const [tournamentDate, setTournamentDate] = useState(session.startDate ?? "")
  const teacherLabel = (id: string) => (lang === "zh" ? teachers.find((x) => x.id === id)?.name : teachers.find((x) => x.id === id)?.nameEn)
  const roomLabel = (id: string) => (lang === "zh" ? rooms.find((x) => x.id === id)?.name : rooms.find((x) => x.id === id)?.nameEn)
  const [start, setStart] = useState(session.start)
  const [end, setEnd] = useState(session.end)
  const [capacity, setCapacity] = useState(String(session.capacity))
  const [levelZh, setLevelZh] = useState(session.level.zh)
  const [levelEn, setLevelEn] = useState(session.level.en)
  const [startDate, setStartDate] = useState(session.startDate ?? "")
  const [endDate, setEndDate] = useState(session.endDate ?? "")

  const capacityNum = Number.parseInt(capacity, 10)
  const isValid =
    start.trim() !== "" &&
    end.trim() !== "" &&
    levelZh.trim() !== "" &&
    levelEn.trim() !== "" &&
    Number.isFinite(capacityNum) &&
    capacityNum > 0 &&
    (kind === "regular" || tournamentDate !== "")

  const handleSave = () => {
    if (!isValid) return
    const resolvedDay = kind === "tournament" ? toAppDay(new Date(tournamentDate)) : Number.parseInt(day, 10)
    onSave({
      id: session.id,
      category,
      kind,
      teacherId,
      roomId,
      day: resolvedDay,
      start: start.trim(),
      end: end.trim(),
      capacity: capacityNum,
      levelZh: levelZh.trim(),
      levelEn: levelEn.trim(),
      startDate: kind === "tournament" ? tournamentDate : startDate || null,
      endDate: kind === "tournament" ? tournamentDate : endDate || null,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {t("adm.schedule.editSingle")} · {t(session.category)}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("stu.filter.category")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
              <SelectTrigger>
                <SelectValue>{(v: CategoryKey) => t(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryKeys.map((ck) => (
                  <SelectItem key={ck} value={ck}>
                    {t(ck)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.schedule.kind")}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "regular" | "tournament")}>
              <SelectTrigger>
                <SelectValue>{(v: "regular" | "tournament") => t(v === "tournament" ? "session.kind.tournament" : "session.kind.regular")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">{t("session.kind.regular")}</SelectItem>
                <SelectItem value="tournament">{t("session.kind.tournament")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        {kind === "tournament" ? (
          <div className="grid gap-2">
            <Label>{t("adm.schedule.tournamentDate")}</Label>
            <Input type="date" value={tournamentDate} onChange={(e) => setTournamentDate(e.target.value)} />
          </div>
        ) : (
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
        )}
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
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.schedule.validFrom")}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.schedule.validTo")}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{t("adm.schedule.validityHint")}</p>
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
        <Button onClick={handleSave} disabled={!isValid || pending}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}

const CLOSURE_ERROR_KEY: Record<string, string> = {
  INVALID_RANGE: "adm.schedule.err.invalidRange",
}
const closureErrorKeyFor = (e: unknown) => CLOSURE_ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

type ClosureDialogState = { mode: "create" } | { mode: "delete"; closure: ClassClosure } | null

function ClosuresSection({
  closures,
  sessions,
  teachers,
}: {
  closures: ClassClosure[]
  sessions: ClassSession[]
  teachers: Teacher[]
}) {
  const { t, lang } = useLanguage()
  const [dialog, setDialog] = useState<ClosureDialogState>(null)

  const sessionLabel = (id: string) => {
    const s = sessions.find((x) => x.id === id)
    if (!s) return "—"
    const teacher = teachers.find((x) => x.id === s.teacherId)
    const teacherName = teacher ? (lang === "zh" ? teacher.name : teacher.nameEn) : ""
    return `${t(weekdayKeys[s.day])} ${s.start} · ${t(s.category)} · ${teacherName}`
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground">
          {t("adm.schedule.closures")}:{" "}
          <span className="font-display font-bold text-foreground">{closures.length}</span>
        </span>
        <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("adm.schedule.addClosure")}
        </Button>
      </div>

      {closures.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          {t("adm.schedule.noClosures")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("adm.schedule.closureScope")}</TableHead>
                <TableHead>{t("adm.schedule.closureNote")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closures.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-card-foreground">
                    {c.startDate} – {c.endDate}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.sessionId ? sessionLabel(c.sessionId) : t("adm.schedule.allClasses")}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate text-muted-foreground" title={c.note ?? undefined}>
                    {c.note ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDialog({ mode: "delete", closure: c })}
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          {dialog?.mode === "create" && <ClosureForm sessions={sessions} onClose={() => setDialog(null)} />}
          {dialog?.mode === "delete" && (
            <DeleteClosureConfirm key={dialog.closure.id} closure={dialog.closure} onClose={() => setDialog(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const ALL_CLASSES_VALUE = "__all__"

function ClosureForm({ sessions, onClose }: { sessions: ClassSession[]; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [note, setNote] = useState("")
  const [sessionId, setSessionId] = useState(ALL_CLASSES_VALUE)
  const [error, setError] = useState<string | null>(null)

  const sessionLabel = (id: string) => {
    if (id === ALL_CLASSES_VALUE) return t("adm.schedule.allClasses")
    const s = sessions.find((x) => x.id === id)
    return s ? `${t(weekdayKeys[s.day])} ${s.start} · ${t(s.category)}` : ""
  }

  const isValid = startDate.trim() !== "" && endDate.trim() !== ""

  const handleConfirm = () => {
    if (!isValid || isPending) return
    setError(null)
    startTransition(async () => {
      try {
        await createClassClosure({
          startDate,
          endDate,
          note,
          sessionId: sessionId === ALL_CLASSES_VALUE ? null : sessionId,
        })
        router.refresh()
        onClose()
      } catch (e) {
        setError(closureErrorKeyFor(e))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("adm.schedule.addClosure")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.schedule.validFrom")}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.schedule.validTo")}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t("adm.schedule.closureScope")}</Label>
          <Select value={sessionId} onValueChange={(v) => setSessionId(v ?? ALL_CLASSES_VALUE)}>
            <SelectTrigger>
              <SelectValue>{sessionLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES_VALUE}>{t("adm.schedule.allClasses")}</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t(weekdayKeys[s.day])} {s.start} · {t(s.category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>{t("adm.schedule.closureNote")}</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("adm.schedule.closureNotePlaceholder")} />
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

function DeleteClosureConfirm({ closure, onClose }: { closure: ClassClosure; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteClassClosure(closure.id)
      router.refresh()
      onClose()
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {t("common.delete")} · {closure.startDate} – {closure.endDate}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">{t("adm.schedule.deleteClosureDesc")}</p>
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

const STUDIO_ERROR_KEY: Record<string, string> = {
  INVALID_NAME: "adm.studios.err.invalidName",
  INVALID_NAME_EN: "adm.studios.err.invalidNameEn",
  STUDIO_IN_USE: "adm.studios.err.inUse",
}
const studioErrorKeyFor = (e: unknown) => STUDIO_ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

type StudioDialogState =
  | { mode: "create" }
  | { mode: "edit"; studio: Studio }
  | { mode: "delete"; studio: Studio }
  | null

function StudiosSection({ studios }: { studios: Studio[] }) {
  const { t } = useLanguage()
  const [dialog, setDialog] = useState<StudioDialogState>(null)

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
                    <StudioIconBtn label={t("common.edit")} onClick={() => setDialog({ mode: "edit", studio: s })}>
                      <Pencil className="h-4 w-4" />
                    </StudioIconBtn>
                    <StudioIconBtn label={t("common.delete")} onClick={() => setDialog({ mode: "delete", studio: s })}>
                      <Trash2 className="h-4 w-4" />
                    </StudioIconBtn>
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

function StudioIconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
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
        setError(studioErrorKeyFor(e))
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
        setError(studioErrorKeyFor(e))
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
