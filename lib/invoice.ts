import jsPDF from "jspdf"
import { BUSINESS, BANK, type InvoiceParty, type InvoiceItem } from "@/lib/invoice-config"

// Draws the studio's one-page TAX INVOICE as a vector PDF. Every coordinate
// below was read from the content stream of an existing invoice exported
// from the spreadsheet template (US Letter, 612×792 pt), then flipped from
// PDF's bottom-left origin to jsPDF's top-left with `y()`. The original uses
// Liberation Sans + Noto Sans; jsPDF's built-in Helvetica matches the former
// metrically and stands in for the latter.

export type InvoiceInput = {
  invoiceNumber: string
  date: string // ISO "YYYY-MM-DD"
  billTo: InvoiceParty
  item: InvoiceItem
}

const PAGE_H = 792
const y = (pdfY: number) => PAGE_H - pdfY

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const LINK_RGB: [number, number, number] = [82, 148, 226]

// Table geometry (x for column edges, PDF-space y for row edges).
const COL_X = [76.839, 223.326, 301.36, 392.729, 479.612, 576.831]
const TABLE_LEFT = 76.522
const TABLE_RIGHT = 577.148
const ROW_Y = [
  448.637, 433.157, 403.025, 389.496, 375.966, 362.436, 348.906, 335.377, 321.847, 308.317, 294.787, 281.258,
  267.728, 254.198, 240.668,
]
const TOTALS_Y = [220.044, 199.421, 185.891, 165.267]
const TOTALS_LEFT = 479.295

export const DESCRIPTION_MAX_LINES = 3
const DESCRIPTION_WIDTH = 143

export function formatInvoiceDate(iso: string): string {
  const [yr, mo, da] = iso.split("-").map(Number)
  return `${MONTHS[mo - 1]} ${da}, ${yr}`
}

export function formatMoney(n: number): string {
  const [whole, cents] = n.toFixed(2).split(".")
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`
}

export function invoiceFileName(iso: string): string {
  return `Agu Dance Invoice ${iso.replaceAll("-", "")}.pdf`
}

export function invoiceTotal(item: InvoiceItem): number {
  return Math.round(item.hours * item.rate * 100) / 100
}

// The description cell is exactly 3 lines tall; callers use this to refuse
// (rather than silently cut off) a description that wraps past that.
export function wrapDescription(text: string): string[] {
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.63)
  return text
    .split("\n")
    .flatMap((line) => (line.trim() ? (doc.splitTextToSize(line.trim(), DESCRIPTION_WIDTH) as string[]) : []))
}

export function buildInvoicePdf(input: InvoiceInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const total = invoiceTotal(input.item)

  const text = (
    str: string,
    x: number,
    pdfY: number,
    size: number,
    opts: { bold?: boolean; align?: "left" | "right"; rgb?: [number, number, number]; underline?: boolean } = {},
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal")
    doc.setFontSize(size)
    const [r, g, b] = opts.rgb ?? [0, 0, 0]
    doc.setTextColor(r, g, b)
    doc.text(str, x, y(pdfY), opts.align ? { align: opts.align } : undefined)
    if (opts.underline) {
      const w = doc.getTextWidth(str)
      doc.setDrawColor(r, g, b)
      doc.setLineWidth(0.488)
      doc.line(x, y(pdfY) + 1.195, x + w, y(pdfY) + 1.195)
    }
  }
  const line = (x1: number, y1: number, x2: number, y2: number, width = 0.64504) => {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(width)
    doc.line(x1, y(y1), x2, y(y2))
  }

  // Header
  text("TAX INVOICE", 576.2, 699.778, 18.966, { align: "right" })
  text(BUSINESS.name, 85.713, 664.138, 11.994, { bold: true })
  text(`ABN: ${BUSINESS.abn}`, 85.713, 647.951, 9.361)
  text("DATE:", 480.489, 663.358, 8.63, { bold: true })
  text(formatInvoiceDate(input.date), 509.182, 663.358, 8.63)
  text("INVOICE:", 480.489, 647.878, 8.63, { bold: true })
  text(input.invoiceNumber, 521.347, 647.878, 8.63)

  // Business contact block
  text(BUSINESS.addressLines[0], 85.713, 616.991, 8.63)
  text(BUSINESS.addressLines[1], 85.713, 601.511, 8.63)
  text(`Ph: ${BUSINESS.phone}`, 85.713, 588.615, 8.63)
  text(`E: ${BUSINESS.email}`, 85.713, 575.646, 8.63, { rgb: LINK_RGB, underline: true })

  // Bill to
  text("BILL TO:", 85.713, 535.763, 8.63, { bold: true })
  text(input.billTo.name, 85.713, 522.234, 8.63)
  text(input.billTo.addressLines[0], 85.713, 508.704, 8.63)
  text(input.billTo.addressLines[1], 85.713, 495.174, 8.63)
  text(`E: ${input.billTo.email}`, 85.713, 481.571, 8.63, { rgb: LINK_RGB, underline: true })

  // Table grid: horizontal rules, then the column rules (the two right-hand
  // columns continue down through the totals boxes).
  for (const rowY of ROW_Y) line(TABLE_LEFT, rowY, TABLE_RIGHT, rowY)
  COL_X.forEach((x, i) => line(x, 448.953, x, i >= 4 ? 164.95 : 240.351))
  for (const ty of TOTALS_Y) line(TOTALS_LEFT, ty, TABLE_RIGHT, ty)

  // Table header
  text("DESCRIPTION", 116.722, 437.106, 10.312)
  text("Date", 250.947, 437.106, 10.312)
  text("Hours/Item", 319.083, 437.106, 10.312)
  text("RATE", 423.933, 437.106, 10.312)
  text("AMOUNT", 505.672, 437.106, 10.312)

  // Line item (description bottom-aligned in its 3-line cell)
  const descLines = wrapDescription(input.item.description).slice(0, DESCRIPTION_MAX_LINES)
  descLines.forEach((l, i) => text(l, 77.644, 405.78 + (descLines.length - 1 - i) * 9.702, 8.63))
  text(formatInvoiceDate(input.date), 224.204, 405.78, 8.63)
  text(input.item.hours.toFixed(2), 391.87, 405.78, 8.63, { align: "right" })
  text(formatMoney(input.item.rate), 478.75, 405.78, 8.63, { align: "right" })
  text(formatMoney(total), 575.97, 405.78, 8.63, { align: "right" })

  // Totals
  text("SUBTOTAL", 479.1, 223.994, 10.312, { align: "right" })
  text(formatMoney(total), 575.4, 223.994, 10.312, { align: "right" })
  text("GST", 479.1, 203.37, 10.312, { align: "right" })
  text("0.00%", 575.4, 203.37, 10.312, { align: "right" })
  text("DISCOUNT", 479.1, 189.84, 10.312, { align: "right" })
  text("$0.00", 575.4, 189.84, 10.312, { align: "right" })
  text("TOTAL", 479.1, 169.216, 10.312, { align: "right", bold: true })
  text(formatMoney(total), 575.4, 169.216, 10.312, { align: "right" })

  // Bank details + closing rule
  text(`Bank Transfer: ${BANK.bankName}`, 77.644, 130.772, 8.63, { bold: true })
  text(`Name: ${BANK.accountName}`, 77.644, 121.07, 8.63)
  text(`BSB: ${BANK.bsb}`, 77.644, 111.368, 8.63)
  text(`Acct: ${BANK.accountNumber}`, 77.644, 101.665, 8.63)
  line(76.839, 67.487, 576.831, 67.487, 1.50509)

  return doc
}
