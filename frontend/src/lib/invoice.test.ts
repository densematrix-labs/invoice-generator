import { describe, expect, it, vi } from 'vitest'
import {
  calculateTotals,
  clampPercent,
  defaultDraft,
  extractErrorMessage,
  formatMoney,
  invoiceApiPayload,
  previewInvoice,
  roundMoney
} from './invoice'

describe('invoice math', () => {
  it('calculates subtotal, discount, tax, and total', () => {
    const totals = calculateTotals({
      taxRate: 8.25,
      discountRate: 10,
      items: [{ id: '1', description: 'Work', quantity: 2, unitPrice: 100 }]
    })
    expect(totals).toEqual({ subtotal: 200, discount: 20, taxableSubtotal: 180, tax: 14.85, total: 194.85 })
  })

  it('clamps invalid percentages', () => {
    expect(clampPercent(-1)).toBe(0)
    expect(clampPercent(150)).toBe(100)
    expect(clampPercent(Number.NaN)).toBe(0)
  })

  it('rounds money and formats currency', () => {
    expect(roundMoney(1.005)).toBe(1.01)
    expect(formatMoney(12.5, 'USD', 'en-US')).toBe('$12.50')
  })
})

describe('api helpers', () => {
  it('maps draft payload to backend schema', () => {
    const draft = defaultDraft(new Date('2026-06-01T00:00:00Z'))
    const payload = invoiceApiPayload(draft)
    expect(payload.items[0]).toHaveProperty('unit_price')
    expect(Object.keys(payload)).not.toContain('invoiceNumber')
  })

  it('extracts object error detail without object Object', () => {
    expect(extractErrorMessage({ error: 'Payment required' })).toBe('Payment required')
    expect(extractErrorMessage({ message: 'Invalid input' })).toBe('Invalid input')
    expect(extractErrorMessage({ nope: true })).toBe('Request failed')
  })

  it('handles preview success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totals: { subtotal: '10', discount: '0', taxable_subtotal: '10', tax: '1', total: '11' } })
    }))
    await expect(previewInvoice(defaultDraft(), 'dev')).resolves.toEqual({ subtotal: 10, discount: 0, taxableSubtotal: 10, tax: 1, total: 11 })
  })

  it('handles string and object detail failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: { error: 'No credits' } }) }))
    await expect(previewInvoice(defaultDraft(), 'dev')).rejects.toThrow('No credits')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: 'Server unavailable' }) }))
    await expect(previewInvoice(defaultDraft(), 'dev')).rejects.toThrow('Server unavailable')
  })
})
