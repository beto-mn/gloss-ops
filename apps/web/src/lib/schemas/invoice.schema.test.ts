import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { createInvoiceSchema } from './invoice.schema'

describe('createInvoiceSchema', () => {
  it('parses valid invoice', () => {
    const result = createInvoiceSchema.parse({
      workOrderId: 'wo-1',
      subtotal: 1000,
      tax: 160,
      total: 1160,
    })
    expect(result.workOrderId).toBe('wo-1')
    expect(result.total).toBe(1160)
  })

  it('coerces string numbers', () => {
    const result = createInvoiceSchema.parse({
      workOrderId: 'wo-1',
      subtotal: '500',
      tax: '80',
      total: '580',
    })
    expect(result.subtotal).toBe(500)
  })

  it('throws ZodError when workOrderId is empty', () => {
    expect(() =>
      createInvoiceSchema.parse({
        workOrderId: '',
        subtotal: 100,
        tax: 16,
        total: 116,
      })
    ).toThrow(ZodError)
  })

  it('throws ZodError when subtotal is negative', () => {
    expect(() =>
      createInvoiceSchema.parse({
        workOrderId: 'wo-1',
        subtotal: -10,
        tax: 0,
        total: 0,
      })
    ).toThrow(ZodError)
  })
})
