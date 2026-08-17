"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { CardProduct, CashierEntry, CardType } from "@/lib/types"
import { createCardProduct, updateCardProduct, deleteCardProduct, type CardProductInput } from "@/lib/actions/cards"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Ticket, Infinity as InfinityIcon, Sparkles } from "lucide-react"

const typeIcon = {
  "stu.card.times": Ticket,
  "stu.card.period": InfinityIcon,
  "stu.card.trial": Sparkles,
}
const cardTypeKeys: CardType[] = ["stu.card.times", "stu.card.period", "stu.card.trial"]

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; product: CardProduct }
  | { mode: "delete"; product: CardProduct }
  | null

const ERROR_KEY: Record<string, string> = {
  INVALID_NAME: "adm.cards.err.invalidName",
  INVALID_NAME_EN: "adm.cards.err.invalidNameEn",
  INVALID_PRICE: "adm.cards.err.invalidPrice",
  INVALID_SESSIONS: "adm.cards.err.invalidSessions",
  INVALID_VALIDITY: "adm.cards.err.invalidValidity",
  CARD_PRODUCT_IN_USE: "adm.cards.err.inUse",
}
const errorKeyFor = (e: unknown) => ERROR_KEY[e instanceof Error ? e.message : ""] ?? "adm.users.err.generic"

export function AdminCards({ cardProducts, cashier }: { cardProducts: CardProduct[]; cashier: CashierEntry[] }) {
  const { t, lang } = useLanguage()
  const [dialog, setDialog] = useState<DialogState>(null)

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">{t("adm.cards.sold")}</h2>
          <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("adm.cards.add")}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cardProducts.map((p) => {
            const Icon = typeIcon[p.type]
            return (
              <div key={p.id} className="relative rounded-2xl border border-border bg-card p-5">
                <div className="absolute right-3 top-3 flex gap-1">
                  <IconBtn label={t("common.edit")} onClick={() => setDialog({ mode: "edit", product: p })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn label={t("common.delete")} onClick={() => setDialog({ mode: "delete", product: p })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-display text-base font-bold text-card-foreground">
                  {lang === "zh" ? p.name.zh : p.name.en}
                </p>
                <p className="text-xs text-muted-foreground">{t(p.type)}</p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="font-display text-2xl font-extrabold text-primary">¥{p.price.toLocaleString()}</p>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>
                      {p.sessions === "unlimited" ? t("stu.cards.unlimited") : `${p.sessions} ${t("adm.cards.sessions")}`}
                    </p>
                    <p>
                      {p.validityDays} {t("unit.days")}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-base font-bold text-foreground">{t("adm.nav.cards")}</h2>
        {cashier.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adm.cards.noCashier")}</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {cashier.map((c, i) => (
              <li
                key={c.id}
                className={`flex items-center justify-between px-5 py-3.5 ${i !== cashier.length - 1 ? "border-b border-border" : ""}`}
              >
                <div>
                  <p className="text-sm font-medium text-card-foreground">{c.studentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.cardName ? (lang === "zh" ? c.cardName.zh : c.cardName.en) : "—"} · {t(c.method)} · {c.paidAt}
                  </p>
                </div>
                <span className="font-display text-base font-bold text-chart-5">+¥{c.amount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          {dialog?.mode === "create" && <CardProductForm onClose={() => setDialog(null)} />}
          {dialog?.mode === "edit" && (
            <CardProductForm key={dialog.product.id} product={dialog.product} onClose={() => setDialog(null)} />
          )}
          {dialog?.mode === "delete" && (
            <DeleteCardProductConfirm key={dialog.product.id} product={dialog.product} onClose={() => setDialog(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 bg-card/80 text-muted-foreground hover:text-primary"
      onClick={onClick}
      title={label}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  )
}

function CardProductForm({ product, onClose }: { product?: CardProduct; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<CardType>(product?.type ?? "stu.card.times")
  const [nameZh, setNameZh] = useState(product?.name.zh ?? "")
  const [nameEn, setNameEn] = useState(product?.name.en ?? "")
  const [price, setPrice] = useState(product ? String(product.price) : "")
  const [isUnlimited, setIsUnlimited] = useState(product?.sessions === "unlimited")
  const [sessions, setSessions] = useState(product && product.sessions !== "unlimited" ? String(product.sessions) : "")
  const [validityDays, setValidityDays] = useState(product ? String(product.validityDays) : "")
  const [error, setError] = useState<string | null>(null)

  const isValid =
    nameZh.trim() !== "" &&
    nameEn.trim() !== "" &&
    price.trim() !== "" &&
    validityDays.trim() !== "" &&
    (isUnlimited || sessions.trim() !== "")

  const handleConfirm = () => {
    if (!isValid || isPending) return
    setError(null)
    const input: CardProductInput = { type, nameZh, nameEn, price, sessions, isUnlimited, validityDays }
    startTransition(async () => {
      try {
        if (product) {
          await updateCardProduct(product.id, input)
        } else {
          await createCardProduct(input)
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
          {product ? `${t("common.edit")} · ${lang === "zh" ? product.name.zh : product.name.en}` : t("adm.cards.add")}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("adm.cards.type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as CardType)}>
            <SelectTrigger>
              <SelectValue>{(v: CardType) => t(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cardTypeKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(k)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.cards.nameZh")}</Label>
            <Input value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.cards.nameEn")}</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("adm.cards.price")}</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adm.cards.validity")}</Label>
            <Input type="number" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <Label>{t("stu.cards.unlimited")}</Label>
          <Switch checked={isUnlimited} onCheckedChange={setIsUnlimited} />
        </div>
        {!isUnlimited && (
          <div className="grid gap-2">
            <Label>{t("adm.cards.sessions")}</Label>
            <Input type="number" value={sessions} onChange={(e) => setSessions(e.target.value)} />
          </div>
        )}
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

function DeleteCardProductConfirm({ product, onClose }: { product: CardProduct; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await deleteCardProduct(product.id)
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
          {t("common.delete")} · {lang === "zh" ? product.name.zh : product.name.en}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">{t("adm.cards.deleteDesc")}</p>
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
