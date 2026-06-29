export type Mode = 'invoice' | 'estimate'
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY'

export type LineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export type InvoiceDraft = {
  mode: Mode
  currency: Currency
  sender: string
  client: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  taxRate: number
  discountRate: number
  notes: string
  items: LineItem[]
}

export type Totals = {
  subtotal: number
  discount: number
  taxableSubtotal: number
  tax: number
  total: number
}

export const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY']

export function calculateTotals(draft: Pick<InvoiceDraft, 'items' | 'taxRate' | 'discountRate'>): Totals {
  const subtotal = roundMoney(draft.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))
  const discount = roundMoney(subtotal * clampPercent(draft.discountRate) / 100)
  const taxableSubtotal = roundMoney(subtotal - discount)
  const tax = roundMoney(taxableSubtotal * clampPercent(draft.taxRate) / 100)
  return {
    subtotal,
    discount,
    taxableSubtotal,
    tax,
    total: roundMoney(taxableSubtotal + tax)
  }
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function formatMoney(value: number, currency: Currency, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

export function invoiceApiPayload(draft: InvoiceDraft) {
  return {
    mode: draft.mode,
    currency: draft.currency,
    sender: draft.sender,
    client: draft.client,
    tax_rate: draft.taxRate,
    discount_rate: draft.discountRate,
    notes: draft.notes,
    items: draft.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice
    }))
  }
}

export function extractErrorMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    const maybe = detail as { error?: unknown; message?: unknown }
    if (typeof maybe.error === 'string') return maybe.error
    if (typeof maybe.message === 'string') return maybe.message
  }
  return 'Request failed'
}

export async function previewInvoice(draft: InvoiceDraft, deviceId: string): Promise<Totals> {
  const response = await fetch('/api/v1/invoices/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId
    },
    body: JSON.stringify(invoiceApiPayload(draft))
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(extractErrorMessage(data.detail))
  }
  return {
    subtotal: Number(data.totals.subtotal),
    discount: Number(data.totals.discount),
    taxableSubtotal: Number(data.totals.taxable_subtotal),
    tax: Number(data.totals.tax),
    total: Number(data.totals.total)
  }
}

export function defaultDraft(today = new Date()): InvoiceDraft {
  const issueDate = today.toISOString().slice(0, 10)
  const due = new Date(today)
  due.setDate(today.getDate() + 14)
  return {
    mode: 'invoice',
    currency: 'USD',
    sender: 'Your Studio\n123 Market Street\nSan Jose, CA',
    client: 'Client Company\n456 Main Avenue\nAustin, TX',
    invoiceNumber: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}01`,
    issueDate,
    dueDate: due.toISOString().slice(0, 10),
    taxRate: 8.25,
    discountRate: 0,
    notes: 'Thank you for your business. This tool creates documents only and does not provide tax advice.',
    items: [
      { id: '1', description: 'Strategy and production work', quantity: 1, unitPrice: 1200 },
      { id: '2', description: 'Design system cleanup', quantity: 3, unitPrice: 95 }
    ]
  }
}

export const seoSlugs = {
  primary: ['free-invoice-generator', 'estimate-generator', 'invoice-template', 'quote-generator'],
  industries: ['freelancers', 'contractors', 'consultants', 'designers', 'photographers', 'agencies', 'landscapers', 'cleaners', 'developers', 'tutors'],
  features: ['tax', 'discount', 'pdf-export', 'payment-terms', 'client-history', 'recurring-invoices', 'branding-removal', 'payment-links', 'templates', 'multi-currency']
}
