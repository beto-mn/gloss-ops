import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  CreateMaterialRollSchema,
  UpdateInventoryUsageSchema,
  ListInventoryQuerySchema,
} from '@glossops/shared'

const validUuid = 'd3f5a1b2-0000-4000-8000-000000000000'

describe('Inventory request schemas', () => {
  describe('CreateInventoryItemSchema', () => {
    it('parses a valid item payload', () => {
      const parsed = CreateInventoryItemSchema.parse({
        name: 'Cutter blade',
        unit: 'pza',
        stock: 10,
      })
      expect(parsed.name).toBe('Cutter blade')
    })

    it('rejects a missing required unit', () => {
      expect(() => CreateInventoryItemSchema.parse({ name: 'x' })).toThrow()
    })
  })

  describe('UpdateInventoryItemSchema', () => {
    it('accepts null to clear nullable fields', () => {
      const parsed = UpdateInventoryItemSchema.parse({
        supplierId: null,
        brandId: null,
        sku: null,
        description: null,
        lowStockAlert: null,
      })
      expect(parsed.supplierId).toBeNull()
      expect(parsed.lowStockAlert).toBeNull()
    })
  })

  describe('CreateMaterialRollSchema', () => {
    it('rejects a width that is not > 0', () => {
      expect(() =>
        CreateMaterialRollSchema.parse({
          name: 'Vinyl',
          series: 'S1',
          finish: 'Gloss',
          color: 'Black',
          width: 0,
          remainingLength: 5,
        })
      ).toThrow()
    })
  })

  describe('UpdateInventoryUsageSchema', () => {
    it('rejects a quantityUsed that is not > 0', () => {
      expect(() =>
        UpdateInventoryUsageSchema.parse({ quantityUsed: 0 })
      ).toThrow()
    })
  })

  describe('ListInventoryQuerySchema', () => {
    it('coerces page/limit and lowStock string flag', () => {
      const parsed = ListInventoryQuerySchema.parse({
        page: '1',
        limit: '20',
        type: 'ITEM',
        supplierId: validUuid,
        lowStock: 'true',
      })
      expect(parsed.page).toBe(1)
      expect(parsed.lowStock).toBe(true)
    })

    it('leaves lowStock undefined when absent and coerces false', () => {
      expect(ListInventoryQuerySchema.parse({}).lowStock).toBeUndefined()
      expect(
        ListInventoryQuerySchema.parse({ lowStock: 'false' }).lowStock
      ).toBe(false)
    })
  })
})
