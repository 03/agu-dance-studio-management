"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { AppUser, AppUserRole } from "@/lib/types"
import {
  createUser,
  updateUser,
  deleteUser,
  adminResetPassword,
  getUnlinkedStudentsAndTeachers,
} from "@/lib/actions/users"
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
import { SortableHead } from "@/components/ui/sortable-head"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, KeyRound, Trash2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const roleStyles: Record<AppUserRole, string> = {
  student: "bg-primary/10 text-primary",
  teacher: "bg-chart-3/15 text-chart-3",
  admin: "bg-accent/15 text-accent",
}
const roleLabelKey: Record<AppUserRole, string> = {
  student: "role.student",
  teacher: "role.teacher",
  admin: "role.admin",
}

// Maps known thrown Error messages from lib/actions/users.ts to i18n keys.
const ERROR_KEY: Record<string, string> = {
  INVALID_USERNAME: "adm.users.err.invalidUsername",
  INVALID_PASSWORD: "adm.users.err.invalidPassword",
  MISSING_LINK: "adm.users.err.missingLink",
  MISSING_STUDENT_FIELDS: "adm.users.err.missingStudentFields",
  MISSING_TEACHER_FIELDS: "adm.users.err.missingTeacherFields",
  LAST_ADMIN: "adm.users.err.lastAdmin",
}
const errorKeyFor = (e: unknown) => ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

type SortField = "username" | "role" | "linkedName" | "createdAt"
type SortDir = "asc" | "desc"

const ROLE_ORDER: Record<AppUserRole, number> = { student: 0, teacher: 1, admin: 2 }

function getSortValue(u: AppUser, field: SortField): string | number {
  switch (field) {
    case "role":
      return ROLE_ORDER[u.role]
    case "linkedName":
      return u.linkedName ?? ""
    default:
      return u[field]
  }
}

function compareUsers(a: AppUser, b: AppUser, field: SortField, dir: SortDir): number {
  const av = getSortValue(a, field)
  const bv = getSortValue(b, field)
  const mul = dir === "asc" ? 1 : -1
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul
  return String(av).localeCompare(String(bv)) * mul
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; user: AppUser }
  | { mode: "reset"; user: AppUser }
  | { mode: "delete"; user: AppUser }
  | null

export function AdminUsers({ users }: { users: AppUser[] }) {
  const { t } = useLanguage()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "createdAt", dir: "desc" })

  const handleSort = (field: SortField) => {
    setSort((prev) => (prev.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }))
  }
  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      (u.linkedName ?? "").toLowerCase().includes(query.toLowerCase()),
  )
  const sorted = [...filtered].sort((a, b) => compareUsers(a, b, sort.field, sort.dir))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground">
          {t("adm.nav.users")}:{" "}
          <span className="font-display font-bold text-foreground">{users.length}</span>
        </span>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.search")}
              className="w-56 pl-9"
            />
          </div>
          <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("adm.users.add")}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="username" label={t("auth.username")} sort={sort} onSort={handleSort} />
              <SortableHead field="role" label={t("adm.users.role")} sort={sort} onSort={handleSort} />
              <SortableHead field="linkedName" label={t("adm.users.linkedTo")} sort={sort} onSort={handleSort} />
              <SortableHead field="createdAt" label={t("adm.users.created")} sort={sort} onSort={handleSort} />
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-card-foreground">{u.username}</TableCell>
                <TableCell>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", roleStyles[u.role])}>
                    {t(roleLabelKey[u.role])}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.linkedName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.createdAt}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <IconBtn label={t("common.edit")} onClick={() => setDialog({ mode: "edit", user: u })}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("adm.users.resetPassword")} onClick={() => setDialog({ mode: "reset", user: u })}>
                      <KeyRound className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("common.delete")} onClick={() => setDialog({ mode: "delete", user: u })}>
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
          {dialog?.mode === "create" && <CreateUserForm onClose={() => setDialog(null)} />}
          {dialog?.mode === "edit" && <EditUserForm user={dialog.user} onClose={() => setDialog(null)} />}
          {dialog?.mode === "reset" && <ResetPasswordForm user={dialog.user} onClose={() => setDialog(null)} />}
          {dialog?.mode === "delete" && <DeleteUserConfirm user={dialog.user} onClose={() => setDialog(null)} />}
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

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [role, setRole] = useState<AppUserRole>("student")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [linkMode, setLinkMode] = useState<"existing" | "new">("existing")
  const [existingId, setExistingId] = useState("")
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newNameEn, setNewNameEn] = useState("")

  const [unlinked, setUnlinked] = useState<{ students: { id: string; name: string }[]; teachers: { id: string; name: string }[] }>({
    students: [],
    teachers: [],
  })
  useEffect(() => {
    getUnlinkedStudentsAndTeachers().then(setUnlinked)
  }, [])

  const options = role === "student" ? unlinked.students : role === "teacher" ? unlinked.teachers : []

  const isValid =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    (role === "admin" ||
      (linkMode === "existing" ? !!existingId : role === "student" ? !!newName.trim() && !!newPhone.trim() : !!newName.trim() && !!newNameEn.trim()))

  const handleConfirm = () => {
    if (!isValid || isPending) return
    startTransition(async () => {
      try {
        await createUser({
          username,
          password,
          role,
          linkMode: role === "admin" ? "none" : linkMode,
          existingId: linkMode === "existing" ? existingId : undefined,
          newName: linkMode === "new" ? newName : undefined,
          newPhone: linkMode === "new" ? newPhone : undefined,
          newNameEn: linkMode === "new" ? newNameEn : undefined,
        })
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
        <DialogTitle className="font-display">{t("adm.users.add")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("adm.users.role")}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppUserRole)}>
            <SelectTrigger>
              <SelectValue>{(v: AppUserRole) => t(roleLabelKey[v])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">{t("role.student")}</SelectItem>
              <SelectItem value="teacher">{t("role.teacher")}</SelectItem>
              <SelectItem value="admin">{t("role.admin")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("auth.username")}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("auth.password")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>

        {role !== "admin" && (
          <>
            <div className="grid gap-2">
              <Label>{t("adm.users.linkMode")}</Label>
              <Select value={linkMode} onValueChange={(v) => setLinkMode(v as "existing" | "new")}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: "existing" | "new") => t(v === "existing" ? "adm.users.linkExisting" : "adm.users.linkNew")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">{t("adm.users.linkExisting")}</SelectItem>
                  <SelectItem value="new">{t("adm.users.linkNew")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkMode === "existing" ? (
              <div className="grid gap-2">
                <Label>{role === "student" ? t("adm.users.pickStudent") : t("adm.users.pickTeacher")}</Label>
                {options.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("adm.users.noneUnlinked")}</p>
                ) : (
                  <Select value={existingId} onValueChange={setExistingId}>
                    <SelectTrigger>
                      <SelectValue>{(v: string) => options.find((o) => o.id === v)?.name ?? ""}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : role === "student" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("common.name")}</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("common.phone")}</Label>
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("common.name")} (中文)</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("common.name")} (English)</Label>
                  <Input value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} />
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid || isPending}>
          {t("common.confirm")}
        </Button>
      </DialogFooter>
    </>
  )
}

function EditUserForm({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [username, setUsername] = useState(user.username)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    if (username.trim().length < 3 || isPending) return
    startTransition(async () => {
      try {
        await updateUser(user.id, username)
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
        <DialogTitle className="font-display">{t("common.edit")} · {user.username}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("auth.username")}</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleConfirm} disabled={username.trim().length < 3 || isPending}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}

function ResetPasswordForm({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    if (password.length < 8 || isPending) return
    startTransition(async () => {
      try {
        await adminResetPassword(user.id, password)
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
        <DialogTitle className="font-display">{t("adm.users.resetPassword")} · {user.username}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">{t("adm.users.resetPasswordDesc")}</p>
        <div className="grid gap-2">
          <Label>{t("auth.newPassword")}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleConfirm} disabled={password.length < 8 || isPending}>
          {t("common.confirm")}
        </Button>
      </DialogFooter>
    </>
  )
}

function DeleteUserConfirm({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await deleteUser(user.id)
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
        <DialogTitle className="font-display">{t("common.delete")} · {user.username}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">{t("adm.users.deleteDesc")}</p>
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
