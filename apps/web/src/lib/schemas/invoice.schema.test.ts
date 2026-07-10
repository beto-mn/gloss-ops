import { describe, it, expect } from 'vitest'

import { CreateInvoiceSchema } from './invoice.schema'

const validWorkOrderId = '11111111-1111-4111-8111-111111111111'

describe('CreateInvoiceSchema (web form)', () => {
  it('parses a minimal invoice with only workOrderId', () => {
    const result = CreateInvoiceSchema.safeParse({
      workOrderId: validWorkOrderId,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.workOrderId).toBe(validWorkOrderId)
    }
  })

  it('accepts optional CFDI fields', () => {
    const result = CreateInvoiceSchema.safeParse({
      workOrderId: validWorkOrderId,
      customerTaxId: 'XAXX010101000',
      customerName: 'Cliente Demo',
      customerAddress: 'Calle 1',
      customerZipCode: '01000',
      customerFiscalRegime: '601',
      cfdiUse: 'G03',
      paymentMethod: 'PUE',
      paymentForm: '03',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.paymentMethod).toBe('PUE')
    }
  })

  it('rejects a non-uuid workOrderId', () => {
    const result = CreateInvoiceSchema.safeParse({ workOrderId: 'wo-1' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid paymentMethod', () => {
    const result = CreateInvoiceSchema.safeParse({
      workOrderId: validWorkOrderId,
      paymentMethod: 'CASH',
    })
    expect(result.success).toBe(false)
  })
})
