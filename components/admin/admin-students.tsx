"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { students, cardProducts, type Student } from "@/lib/mock-data"
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

export function AdminStudents() {
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
            <ActionForm student={dialog.student} action={dialog.action} onClose={() => setDialog(null)} />
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

function ActionForm({ student, action, onClose }: { student: Student; action: Action; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const requiresReason = action === "adm.students.gift" || action === "adm.students.adjust" || action === "adm.students.refund"

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
            <Select defaultValue={cardProducts[0].id}>
              <SelectTrigger>
                <SelectValue />
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
          <div className="grid gap-2">
            <Label>{action === "adm.students.refund" ? t("adm.cards.price") : t("adm.cards.sessions")}</Label>
            <Input type="number" defaultValue={action === "adm.students.gift" ? "2" : "1"} />
          </div>
        )}

        {requiresReason && (
          <div className="grid gap-2">
            <Label>{t("adm.reason")}</Label>
            <Input placeholder={t("common.notes")} />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button onClick={onClose}>{t("common.confirm")}</Button>
      </DialogFooter>
    </>
  )
}
