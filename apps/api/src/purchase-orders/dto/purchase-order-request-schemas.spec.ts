import {
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
  ReceivePurchaseOrderSchema,
  ListPurchaseOrdersQuerySchema,
} from '@glossops/shared'

const validUuid = 'd3f5a1b2-0000-4000-8000-000000000000'

describe('Purchase order request schemas', () => {
  describe('CreatePurchaseOrderSchema', () => {
    it('parses a valid payload with items', () => {
      const parsed = CreatePurchaseOrderSchema.parse({
        supplierId: validUuid,
        items: [{ inventoryId: validUuid, quantity: 5, unitCost: 100 }],
      })
      expect(parsed.items).toHaveLength(1)
    })

    it('rejects a missing items array', () => {
      expect(() =>
        CreatePurchaseOrderSchema.parse({ supplierId: validUuid })
      ).toThrow()
    })

    it('rejects an item with quantity not > 0', () => {
      expect(() =>
        CreatePurchaseOrderSchema.parse({
          supplierId: validUuid,
          items: [{ inventoryId: validUuid, quantity: 0, unitCost: 1 }],
        })
      ).toThrow()
    })

    it('accepts a full ISO datetime for expectedAt', () => {
      const result = CreatePurchaseOrderSchema.safeParse({
        supplierId: validUuid,
        expectedAt: '2026-07-04T10:00:00.000Z',
        items: [{ inventoryId: validUuid, quantity: 5, unitCost: 100 }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects a date-only string for expectedAt', () => {
      const result = CreatePurchaseOrderSchema.safeParse({
        supplierId: validUuid,
        expectedAt: '2026-07-04',
        items: [{ inventoryId: validUuid, quantity: 5, unitCost: 100 }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdatePurchaseOrderSchema', () => {
    it('accepts null to clear expectedAt and note', () => {
      const parsed = UpdatePurchaseOrderSchema.parse({
        expectedAt: null,
        note: null,
      })
      expect(parsed.expectedAt).toBeNull()
      expect(parsed.note).toBeNull()
    })
  })

  describe('ReceivePurchaseOrderSchema', () => {
    it('parses a valid receive payload', () => {
      const parsed = ReceivePurchaseOrderSchema.parse({
        items: [{ itemId: validUuid, receivedQuantity: 3 }],
      })
      expect(parsed.items[0].receivedQuantity).toBe(3)
    })
  })

  describe('ListPurchaseOrdersQuerySchema', () => {
    it('coerces page/limit and accepts status filter', () => {
      const parsed = ListPurchaseOrdersQuerySchema.parse({
        page: '1',
        limit: '20',
        status: 'DRAFT',
      })
      expect(parsed.status).toBe('DRAFT')
    })
  })
})
