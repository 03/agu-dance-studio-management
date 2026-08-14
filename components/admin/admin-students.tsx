"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { Student, StudentCard, CardProduct } from "@/lib/types"
import { buyOrRenewCard, giftClasses, adjustBalance, refundCard } from "@/lib/actions/students"
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
import { Search, CreditCard, Gift, SlidersHorizontal, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

type Action = "adm.students.addCard" | "adm.students.gift" | "adm.students.adjust" | "adm.students.refund"

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

export function AdminStudents({
  students,
  cardProducts,
}: {
  students: Student[]
  cardProducts: CardProduct[]
}) {
  const { t, lang } = useLanguage()
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState<{ student: Student; action: Action } | null>(null)

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.phone.includes(query),
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground">
            {t("adm.students.total")}:{" "}
            <span className="font-display font-bold text-foreground">{students.length}</span>
          </span>
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

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead>{t("stu.nav.cards")}</TableHead>
              <TableHead>{t("stu.cards.balance")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
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
                <TableCell className="text-muted-foreground">{s.phone}</TableCell>
                <TableCell className="text-muted-foreground">{s.cards}</TableCell>
                <TableCell className="font-display font-bold text-card-foreground">{s.totalBalance}</TableCell>
                <TableCell>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusStyles[s.status])}>
                    {lang === "zh" ? statusLabel[s.status].zh : statusLabel[s.status].en}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <IconBtn label={t("adm.students.addCard")} onClick={() => setDialog({ student: s, action: "adm.students.addCard" })}>
                      <CreditCard className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("adm.students.gift")} onClick={() => setDialog({ student: s, action: "adm.students.gift" })}>
                      <Gift className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("adm.students.adjust")} onClick={() => setDialog({ student: s, action: "adm.students.adjust" })}>
                      <SlidersHorizontal className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t("adm.students.refund")} onClick={() => setDialog({ student: s, action: "adm.students.refund" })}>
                      <RotateCcw className="h-4 w-4" />
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
          {dialog && (
            <ActionForm
              key={`${dialog.student.id}-${dialog.action}`}
              student={dialog.student}
              action={dialog.action}
              cardProducts={cardProducts}
              onClose={() => setDialog(null)}
            />
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

function ActionForm({
  student,
  action,
  cardProducts,
  onClose,
}: {
  student: Student
  action: Action
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
        await buyOrRenewCard(student.id, productId)
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
                    return p ? `${lang === "zh" ? p.name.zh : p.name.en} · ¥${p.price}` : ""
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cardProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {lang === "zh" ? p.name.zh : p.name.en} · ¥{p.price}
                  </SelectItem>
                ))}
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
