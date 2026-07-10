import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  TransitionInvoiceSchema,
  ListInvoicesQuerySchema,
} from '@glossops/shared'

const validUuid = 'd3f5a1b2-0000-4000-8000-000000000000'

describe('Invoice request schemas', () => {
  describe('CreateInvoiceSchema', () => {
    it('parses a valid payload', () => {
      const parsed = CreateInvoiceSchema.parse({
        workOrderId: validUuid,
        paymentMethod: 'PUE',
      })
      expect(parsed.workOrderId).toBe(validUuid)
      expect(parsed.paymentMethod).toBe('PUE')
    })

    it('rejects a missing workOrderId', () => {
      expect(() => CreateInvoiceSchema.parse({})).toThrow()
    })

    it('rejects an invalid paymentMethod enum value', () => {
      expect(() =>
        CreateInvoiceSchema.parse({
          workOrderId: validUuid,
          paymentMethod: 'X',
        })
      ).toThrow()
    })
  })

  describe('UpdateInvoiceSchema', () => {
    it('is the create shape minus workOrderId, all partial', () => {
      const parsed = UpdateInvoiceSchema.parse({ customerName: 'ACME' })
      expect(parsed.customerName).toBe('ACME')
      expect('workOrderId' in parsed).toBe(false)
    })

    it('strips a supplied workOrderId (not in schema)', () => {
      const parsed = UpdateInvoiceSchema.parse({
        workOrderId: validUuid,
      }) as Record<string, unknown>
      expect(parsed.workOrderId).toBeUndefined()
    })
  })

  describe('TransitionInvoiceSchema', () => {
    it('accepts a valid status and rejects an invalid one', () => {
      expect(TransitionInvoiceSchema.parse({ status: 'ISSUED' }).status).toBe(
        'ISSUED'
      )
      expect(() => TransitionInvoiceSchema.parse({ status: 'NOPE' })).toThrow()
    })
  })

  describe('ListInvoicesQuerySchema', () => {
    it('coerces page/limit and accepts status filter', () => {
      const parsed = ListInvoicesQuerySchema.parse({
        page: '1',
        limit: '20',
        status: 'PAID',
      })
      expect(parsed.status).toBe('PAID')
    })
  })
})
