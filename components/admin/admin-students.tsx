"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { useLanguage } from "@/lib/i18n"
import type { Student, StudentCard, CardProduct, PaymentMethod } from "@/lib/types"
import {
  buyOrRenewCard,
  giftClasses,
  adjustBalance,
  refundCard,
  updateStudent,
  deleteStudent,
} from "@/lib/actions/students"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  CreditCard,
  Gift,
  SlidersHorizontal,
  RotateCcw,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"

type CardAction = "adm.students.addCard" | "adm.students.gift" | "adm.students.adjust" | "adm.students.refund"

type DialogState =
  | { mode: "card"; student: Student; action: CardAction }
  | { mode: "edit"; student: Student }
  | { mode: "delete"; student: Student }
  | { mode: "usage"; student: Student }
  | null

const statusStyles: Record<Student["status"], string> = {
  active: "bg-chart-5/10 text-chart-5",
  expiring: "bg-accent/15 text-accent",
  inactive: "bg-muted text-muted-foreground",
}
const statusLabel: Record<Student["status"], { zh: string; en: string }> = {
  active: { zh: "活跃", en: "Active" },
  expiring: { zh: "即将到期", en: "Expiring" },
  inactive: { zh: "已停用", en: "Inactive" },
}

// Maps known thrown Error messages from lib/actions/students.ts to i18n keys.
const ERROR_KEY: Record<string, string> = {
  INVALID_NAME: "adm.students.err.invalidName",
  INVALID_PHONE: "adm.students.err.invalidPhone",
  INVALID_JOINED: "adm.students.err.invalidJoined",
  STUDENT_HAS_HISTORY: "adm.students.err.hasHistory",
}
const errorKeyFor = (e: unknown) => ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

// Default target for gift/adjust/refund: the non-unlimited, non-expired
// card closest to running out — the admin can still override via the
// dropdown. Falls back to an unlimited card if no timed card qualifies.
function pickDefaultCard(cards: StudentCard[]): StudentCard | undefined {
  const now = Date.now()
  const timed = cards
    .filter((c) => c.balance !== "unlimited" && new Date(c.expiry).getTime() > now)
    .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())
  if (timed.length) return timed[0]
  return cards.find((c) => c.balance === "unlimited")
}

type SortField =
  | "id"
  | "name"
  | "phone"
  | "wechat"
  | "code"
  | "cards"
  | "totalBalance"
  | "usedSessions"
  | "totalSessions"
  | "status"
type SortDir = "asc" | "desc"

const STATUS_ORDER: Record<Student["status"], number> = { active: 0, expiring: 1, inactive: 2 }

function getSortValue(s: Student, field: SortField): string | number {
  switch (field) {
    case "cards":
      return s.cards
    case "totalBalance":
      return s.totalBalance
    case "usedSessions":
      return s.usedSessions ?? 0
    case "status":
      return STATUS_ORDER[s.status]
    case "wechat":
      return s.wechat ?? ""
    case "code":
      return s.code ?? ""
    case "phone":
      return s.phone ?? ""
    case "totalSessions":
      return s.totalBalance + (s.usedSessions ?? 0)
    default:
      return s[field]
  }
}

function compareStudents(a: Student, b: Student, field: SortField, dir: SortDir): number {
  const av = getSortValue(a, field)
  const bv = getSortValue(b, field)
  const mul = dir === "asc" ? 1 : -1
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul
  return String(av).localeCompare(String(bv)) * mul
}

export function AdminStudents({
  students,
  cardProducts,
}: {
  students: Student[]
  cardProducts: CardProduct[]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState<DialogState>(null)
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "name", dir: "asc" })
  const [isRefreshing, startRefresh] = useTransition()
  const refresh = () => startRefresh(() => router.refresh())

  const handleSort = (field: SortField) => {
    setSort((prev) => (prev.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }))
  }

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(query.toLowerCase()) || (s.phone ?? "").includes(query),
  )
  const sorted = [...filtered].sort((a, b) => compareStudents(a, b, sort.field, sort.dir))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground">
            {t("adm.students.total")}:{" "}
            <span className="font-display font-bold text-foreground">{students.length}</span>
          </span>
          <Button variant="outline" size="icon" onClick={refresh} disabled={isRefreshing} title={t("common.refresh")}>
            <RotateCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-56 pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="name" label={t("common.name")} sort={sort} onSort={handleSort} />
              <SortableHead field="phone" label={t("common.phone")} sort={sort} onSort={handleSort} />
              <SortableHead field="wechat" label={t("auth.wechat")} sort={sort} onSort={handleSort} />
              <SortableHead field="code" label={t("adm.students.code")} sort={sort} onSort={handleSort} />
              <SortableHead field="cards" label={t("stu.nav.cards")} sort={sort} onSort={handleSort} />
              <SortableHead field="totalSessions" label={t("adm.students.totalSessions")} sort={sort} onSort={handleSort} />
              <SortableHead field="usedSessions" label={t("adm.students.usedSessions")} sort={sort} onSort={handleSort} />
              <SortableHead field="totalBalance" label={t("stu.cards.balance")} sort={sort} onSort={handleSort} />
              <SortableHead field="status" label={t("common.status")} sort={sort} onSort={handleSort} />
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {s.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-card-foreground">{s.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.wechat ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.code ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.cards}</TableCell>
                <TableCell className="font-display font-bold text-card-foreground">
                  {s.totalBalance + (s.usedSessions ?? 0)}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setDialog({ mode: "usage", student: s })}
                    className="font-display font-bold text-primary underline-offset-2 hover:underline"
                  >
                    {s.usedSessions ?? 0}
                  </button>
                </TableCell>
                <TableCell className="font-display font-bold text-card-foreground">{s.totalBalance}</TableCell>
                <TableCell>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusStyles[s.status])}>
                    {lang === "zh" ? statusLabel[s.status].zh : statusLabel[s.status].en}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <IconBtn label={t("adm.students.addCard")} onClick={() => setDialog({ mode: "card", student: s, action: "adm.students.addCard" })}>
                      <CreditCard className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("adm.students.gift")} onClick={() => setDialog({ mode: "card", student: s, action: "adm.students.gift" })}>
                      <Gift className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("adm.students.adjust")} onClick={() => setDialog({ mode: "card", student: s, action: "adm.students.adjust" })}>
                      <SlidersHorizontal className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("adm.students.refund")} onClick={() => setDialog({ mode: "card", student: s, action: "adm.students.refund" })}>
                      <RotateCcw className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("common.edit")} onClick={() => setDialog({ mode: "edit", student: s })}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("common.delete")} onClick={() => setDialog({ mode: "delete", student: s })}>
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
          {dialog?.mode === "card" && (
            <ActionForm
              key={`${dialog.student.id}-${dialog.action}`}
              student={dialog.student}
              action={dialog.action}
              cardProducts={cardProducts}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog?.mode === "edit" && (
            <EditStudentForm key={dialog.student.id} student={dialog.student} onClose={() => setDialog(null)} />
          )}
          {dialog?.mode === "delete" && (
            <DeleteStudentConfirm key={dialog.student.id} student={dialog.student} onClose={() => setDialog(null)} />
          )}
          {dialog?.mode === "usage" && (
            <UsageHistoryDialog key={dialog.student.id} student={dialog.student} onClose={() => setDialog(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SortableHead({
  field,
  label,
  sort,
  onSort,
}: {
  field: SortField
  label: string
  sort: { field: SortField; dir: SortDir }
  onSort: (field: SortField) => void
}) {
  const active = sort.field === field
  return (
    <TableHead>
      <button
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap font-medium transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
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

function EditStudentForm({ student, onClose }: { student: Student; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone ?? "")
  const [wechat, setWechat] = useState(student.wechat ?? "")
  const [email, setEmail] = useState(student.email ?? "")
  const [code, setCode] = useState(student.code ?? "")
  const [joined, setJoined] = useState(student.joined)
  const [status, setStatus] = useState<Student["status"]>(student.status)
  const [error, setError] = useState<string | null>(null)

  const isValid = name.trim() !== "" && joined.trim() !== ""

  const handleConfirm = () => {
    if (!isValid || isPending) return
    setError(null)
    startTransition(async () => {
      try {
        await updateStudent(student.id, { name, phone, wechat, email, code, joined, status })
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
          {t("common.edit")} · {student.name}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("common.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("common.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("auth.wechat")}</Label>
            <Input value={wechat} onChange={(e) => setWechat(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("auth.email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.students.code")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("common.date")}</Label>
            <Input value={joined} onChange={(e) => setJoined(e.target.value)} placeholder="2024-06" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t("common.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Student["status"])}>
            <SelectTrigger>
              <SelectValue>
                {(v: Student["status"]) => (lang === "zh" ? statusLabel[v].zh : statusLabel[v].en)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{lang === "zh" ? statusLabel.active.zh : statusLabel.active.en}</SelectItem>
              <SelectItem value="expiring">{lang === "zh" ? statusLabel.expiring.zh : statusLabel.expiring.en}</SelectItem>
              <SelectItem value="inactive">{lang === "zh" ? statusLabel.inactive.zh : statusLabel.inactive.en}</SelectItem>
            </SelectContent>
          </Select>
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

function DeleteStudentConfirm({ student, onClose }: { student: Student; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await deleteStudent(student.id)
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
          {t("common.delete")} · {student.name}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">{t("adm.students.deleteDesc")}</p>
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

// Renders the history into a blank, same-origin iframe and rasterizes it
// with html2canvas directly (not jsPDF's html() convenience wrapper, which
// ignores the target element's own document/window and always captures the
// top-level page). jsPDF's built-in fonts have no CJK glyphs, so text drawn
// directly would come out blank; rasterizing real DOM text sidesteps that.
// The iframe matters too: html2canvas walks up the full ancestor chain to
// resolve inherited styles, and this app's global stylesheet defines its
// whole theme in oklch() — a color space html2canvas's parser can't read.
// A div in the real page would still drag those ancestors in; an iframe
// with its own blank document has none.
async function downloadUsagePdf(student: Student, lang: "zh" | "en") {
  const history = student.usageHistory ?? []
  const rows = history
    .map(
      (e) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${e.date}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${lang === "zh" ? e.title.zh : e.title.en}</td></tr>`,
    )
    .join("")
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:700px;height:1000px;border:0;"
  document.body.appendChild(iframe)
  try {
    const idoc = iframe.contentDocument
    if (!idoc) return
    idoc.open()
    idoc.write(`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;background:#fff;color:#111;">
      <div style="padding:24px;">
        <h2 style="margin:0 0 4px;font-size:18px;">${student.name} · ${lang === "zh" ? "已用课时记录" : "Used Sessions"}</h2>
        <p style="margin:0 0 16px;color:#666;font-size:12px;">${lang === "zh" ? "共" : "Total"} ${history.length} ${lang === "zh" ? "课时" : "sessions"}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #333;">${lang === "zh" ? "时间" : "Time"}</th>
              <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #333;">${lang === "zh" ? "班级" : "Class"}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </body></html>`)
    idoc.close()

    const canvas = await html2canvas(idoc.body, { backgroundColor: "#ffffff" })
    const imgData = canvas.toDataURL("image/png")
    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const imgWidth = pageWidth - 48
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    doc.addImage(imgData, "PNG", 24, 24, imgWidth, imgHeight)
    doc.save(`${student.name}-usage.pdf`)
  } finally {
    document.body.removeChild(iframe)
  }
}

function UsageHistoryDialog({ student, onClose }: { student: Student; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const [isDownloading, setIsDownloading] = useState(false)
  const history = student.usageHistory ?? []

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadUsagePdf(student, lang)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {t("adm.students.usedSessions")} · {student.name}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3 py-2">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adm.students.noUsage")}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.time")}</TableHead>
                  <TableHead>{t("adm.students.usageClass")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{e.date}</TableCell>
                    <TableCell className="text-card-foreground">{lang === "zh" ? e.title.zh : e.title.en}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button onClick={handleDownload} disabled={isDownloading || history.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          {t("adm.students.downloadPdf")}
        </Button>
      </DialogFooter>
    </>
  )
}

function ActionForm({
  student,
  action,
  cardProducts,
  onClose,
}: {
  student: Student
  action: CardAction
  cardProducts: CardProduct[]
  onClose: () => void
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const requiresReason = action === "adm.students.gift" || action === "adm.students.adjust" || action === "adm.students.refund"
  const requiresCard = requiresReason

  const cards = student.cardDetails ?? []
  const [productId, setProductId] = useState(cardProducts[0]?.id ?? "")
  const [method, setMethod] = useState<PaymentMethod>("payment.transfer")
  const [cardId, setCardId] = useState(() => pickDefaultCard(cards)?.id ?? "")
  const [amount, setAmount] = useState(action === "adm.students.gift" ? "2" : "1")
  const [reason, setReason] = useState("")

  const numericAmount = Number.parseInt(amount, 10)
  const isValid =
    action === "adm.students.addCard"
      ? !!productId
      : !!cardId &&
        Number.isFinite(numericAmount) &&
        numericAmount !== 0 &&
        (action === "adm.students.adjust" || numericAmount > 0) &&
        (!requiresReason || reason.trim() !== "")

  const handleConfirm = () => {
    if (!isValid || isPending) return
    startTransition(async () => {
      if (action === "adm.students.addCard") {
        await buyOrRenewCard(student.id, productId, method)
      } else if (action === "adm.students.gift") {
        await giftClasses(student.id, cardId, numericAmount, reason.trim())
      } else if (action === "adm.students.adjust") {
        await adjustBalance(student.id, cardId, numericAmount, reason.trim())
      } else {
        await refundCard(student.id, cardId, numericAmount, reason.trim())
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {t(action)} · {student.name}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        {action === "adm.students.addCard" ? (
          <div className="grid gap-2">
            <Label>{t("adm.cards.sold")}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string) => {
                    const p = cardProducts.find((x) => x.id === v)
                    return p ? `${lang === "zh" ? p.name.zh : p.name.en} · $${p.price}` : ""
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cardProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {lang === "zh" ? p.name.zh : p.name.en} · ${p.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {action === "adm.students.addCard" ? (
          <div className="grid gap-2">
            <Label>{t("adm.cards.paymentMethod")}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue>{(v: PaymentMethod) => t(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment.transfer">{t("payment.transfer")}</SelectItem>
                <SelectItem value="payment.cash">{t("payment.cash")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label>{t("stu.nav.cards")}</Label>
              {cards.length === 0 ? (
                <p className="text-sm text-destructive">{t("adm.students.noCard")}</p>
              ) : (
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v: string) => {
                        const c = cards.find((x) => x.id === v)
                        return c ? `${lang === "zh" ? c.name.zh : c.name.en} · ${c.balance === "unlimited" ? t("stu.cards.unlimited") : c.balance}` : ""
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {lang === "zh" ? c.name.zh : c.name.en} · {c.balance === "unlimited" ? t("stu.cards.unlimited") : c.balance}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-2">
              <Label>{action === "adm.students.refund" ? t("adm.cards.price") : t("adm.cards.sessions")}</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </>
        )}

        {requiresReason && (
          <div className="grid gap-2">
            <Label>{t("adm.reason")}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("common.notes")} />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid || isPending || (requiresCard && cards.length === 0)}>
          {t("common.confirm")}
        </Button>
      </DialogFooter>
    </>
  )
}
