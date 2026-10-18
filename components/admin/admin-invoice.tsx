"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Download } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { todayISO } from "@/lib/schedule-dates"
import { DEFAULT_BILL_TO, DEFAULT_ITEM } from "@/lib/invoice-config"
import {
  buildInvoicePdf,
  invoiceFileName,
  wrapDescription,
  formatMoney,
  DESCRIPTION_MAX_LINES,
} from "@/lib/invoice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function AdminInvoice() {
  const { t } = useLanguage()
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [date, setDate] = useState(() => todayISO())
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [billName, setBillName] = useState(DEFAULT_BILL_TO.name)
  const [billAddr1, setBillAddr1] = useState(DEFAULT_BILL_TO.addressLines[0])
  const [billAddr2, setBillAddr2] = useState(DEFAULT_BILL_TO.addressLines[1])
  const [billEmail, setBillEmail] = useState(DEFAULT_BILL_TO.email)
  const [description, setDescription] = useState(DEFAULT_ITEM.description)
  const [hours, setHours] = useState(String(DEFAULT_ITEM.hours))
  const [rate, setRate] = useState(String(DEFAULT_ITEM.rate))

  const hoursNum = Number(hours)
  const rateNum = Number(rate)
  const numbersOk = hours.trim() !== "" && rate.trim() !== "" && hoursNum > 0 && rateNum >= 0
  const total = numbersOk ? Math.round(hoursNum * rateNum * 100) / 100 : null
  const descLines = useMemo(() => wrapDescription(description), [description])
  const descriptionFits = descLines.length > 0 && descLines.length <= DESCRIPTION_MAX_LINES
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date)
  const canDownload = invoiceNumber.trim() !== "" && dateOk && numbersOk && descriptionFits

  const download = () => {
    if (!canDownload) return
    const doc = buildInvoicePdf({
      invoiceNumber: invoiceNumber.trim(),
      date,
      billTo: { name: billName, addressLines: [billAddr1, billAddr2], email: billEmail },
      item: { description, hours: hoursNum, rate: rateNum },
    })
    doc.save(invoiceFileName(date))
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="inv-number">{t("adm.invoice.number")}</Label>
            <Input
              id="inv-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="#ADS2610-02"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-date">{t("adm.invoice.date")}</Label>
            <Input id="inv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex items-center gap-1 self-start text-sm font-medium text-primary"
          aria-expanded={detailsOpen}
        >
          <ChevronDown className={cn("size-4 transition-transform", detailsOpen && "rotate-180")} />
          {t("adm.invoice.details")}
        </button>

        {detailsOpen && (
          <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
            <div className="grid gap-2">
              <Label>{t("adm.invoice.billName")}</Label>
              <Input value={billName} onChange={(e) => setBillName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adm.invoice.billAddress")}</Label>
              <Input value={billAddr1} onChange={(e) => setBillAddr1(e.target.value)} />
              <Input value={billAddr2} onChange={(e) => setBillAddr2(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adm.invoice.billEmail")}</Label>
              <Input value={billEmail} onChange={(e) => setBillEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adm.invoice.description")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              {!descriptionFits && (
                <p className="text-xs text-destructive">
                  {t("adm.invoice.err.descriptionLines").replace("{n}", String(DESCRIPTION_MAX_LINES))}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adm.invoice.hours")}</Label>
                <Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adm.invoice.rate")}</Label>
                <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {t("adm.invoice.total")}{" "}
            <span className="font-display text-base font-bold text-card-foreground">
              {total != null ? formatMoney(total) : "—"}
            </span>
          </p>
          <Button onClick={download} disabled={!canDownload}>
            <Download />
            {t("adm.invoice.download")}
          </Button>
        </div>
      </div>
    </div>
  )
}
