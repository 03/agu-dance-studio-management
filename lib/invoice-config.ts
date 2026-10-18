// Today's fixed invoice content — copied from the studio's existing invoice
// PDFs (the spreadsheet template they were exported from). The admin's
// invoice form (components/admin/admin-invoice.tsx) pre-fills its editable
// fields from DEFAULT_INVOICE; the business block below is never editable
// in the form and only changes here.
export type InvoiceParty = {
  name: string
  addressLines: [string, string]
  email: string
}

export type InvoiceBusiness = InvoiceParty & {
  abn: string
  phone: string
}

export type InvoiceBank = {
  bankName: string
  accountName: string
  bsb: string
  accountNumber: string
}

export type InvoiceItem = {
  // Up to 3 lines (the template's description cell holds exactly 3).
  description: string
  hours: number
  rate: number
}

export const BUSINESS: InvoiceBusiness = {
  name: "Agu Dance",
  abn: "24 884 022 615",
  addressLines: ["9a Paula Cresent", "Doncaster East VIC 3109"],
  phone: "0479 117 119",
  email: "luwen.yang1985@gmail.com",
}

export const BANK: InvoiceBank = {
  bankName: "Westpac",
  accountName: "Luwen Yang",
  bsb: "733-396",
  accountNumber: "717064",
}

export const DEFAULT_BILL_TO: InvoiceParty = {
  name: "Ms Mei Hu",
  addressLines: ["39 Tidcombe Cresent", "Doncaster East VIC 3109"],
  email: "huhuanmei@gmail.com",
}

export const DEFAULT_ITEM: InvoiceItem = {
  description: "Service for Anna Chan\nAssistance with Social and\nCommunity Participation",
  hours: 1.5,
  rate: 45,
}
