import {
  CreateWorkOrderSchema,
  UpdateWorkOrderSchema,
  TransitionWorkOrderStatusSchema,
  CreateWorkOrderItemSchema,
  UpdateWorkOrderItemSchema,
  ListWorkOrdersQuerySchema,
} from '@glossops/shared'

const validUuid = 'd3f5a1b2-0000-4000-8000-000000000000'

describe('Work order request schemas', () => {
  describe('CreateWorkOrderSchema', () => {
    it('parses a valid payload with inline items', () => {
      const parsed = CreateWorkOrderSchema.parse({
        assetId: validUuid,
        type: 'STANDARD',
        items: [{ serviceId: validUuid, unitPrice: 1500 }],
      })
      expect(parsed.assetId).toBe(validUuid)
      expect(parsed.items).toHaveLength(1)
    })

    it('strips unknown keys', () => {
      const parsed = CreateWorkOrderSchema.parse({
        assetId: validUuid,
        bogus: 'x',
      }) as Record<string, unknown>
      expect(parsed.bogus).toBeUndefined()
    })

    it('rejects a missing assetId', () => {
      expect(() => CreateWorkOrderSchema.parse({})).toThrow()
    })

    it('rejects an invalid type enum value', () => {
      expect(() =>
        CreateWorkOrderSchema.parse({ assetId: validUuid, type: 'BOGUS' })
      ).toThrow()
    })

    it('rejects an inline item with negative unitPrice', () => {
      expect(() =>
        CreateWorkOrderSchema.parse({
          assetId: validUuid,
          items: [{ serviceId: validUuid, unitPrice: -1 }],
        })
      ).toThrow()
    })

    it('accepts a full ISO datetime for scheduledAt', () => {
      const result = CreateWorkOrderSchema.safeParse({
        assetId: validUuid,
        scheduledAt: '2026-07-04T10:00:00.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('rejects a date-only string for scheduledAt', () => {
      const result = CreateWorkOrderSchema.safeParse({
        assetId: validUuid,
        scheduledAt: '2026-07-04',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateWorkOrderSchema', () => {
    it('accepts null to clear scheduledAt and note', () => {
      const parsed = UpdateWorkOrderSchema.parse({
        scheduledAt: null,
        note: null,
      })
      expect(parsed.scheduledAt).toBeNull()
      expect(parsed.note).toBeNull()
    })

    it('accepts a partial (empty) payload', () => {
      expect(UpdateWorkOrderSchema.parse({})).toEqual({})
    })
  })

  describe('TransitionWorkOrderStatusSchema', () => {
    it('accepts a valid status', () => {
      expect(
        TransitionWorkOrderStatusSchema.parse({ status: 'COMPLETED' }).status
      ).toBe('COMPLETED')
    })

    it('rejects an invalid status', () => {
      expect(() =>
        TransitionWorkOrderStatusSchema.parse({ status: 'NOPE' })
      ).toThrow()
    })
  })

  describe('CreateWorkOrderItemSchema / UpdateWorkOrderItemSchema', () => {
    it('parses a valid standalone item', () => {
      const parsed = CreateWorkOrderItemSchema.parse({
        serviceId: validUuid,
        unitPrice: 500,
        isBillable: true,
      })
      expect(parsed.unitPrice).toBe(500)
    })

    it('allows null description on update (clearing)', () => {
      expect(
        UpdateWorkOrderItemSchema.parse({ description: null }).description
      ).toBeNull()
    })
  })

  describe('ListWorkOrdersQuerySchema', () => {
    it('coerces page/limit and accepts status filter', () => {
      const parsed = ListWorkOrdersQuerySchema.parse({
        page: '2',
        limit: '20',
        status: 'DRAFT',
      })
      expect(parsed.page).toBe(2)
      expect(parsed.status).toBe('DRAFT')
    })
  })
})
