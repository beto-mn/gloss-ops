import {
  ListCustomerAssetsQuerySchema,
  CreateCustomerAssetSchema,
  UpdateCustomerAssetSchema,
} from '@glossops/shared'

const validBrandId = 'd3f5a1b2-0000-4000-8000-000000000000'

describe('Customer asset request schemas', () => {
  describe('CreateCustomerAssetSchema', () => {
    it('parses a valid flat payload', () => {
      const parsed = CreateCustomerAssetSchema.parse({
        assetType: 'VEHICLE',
        brandId: validBrandId,
        model: 'Civic',
        identifier: 'ABC-123',
      })
      expect(parsed.assetType).toBe('VEHICLE')
      expect(parsed.model).toBe('Civic')
    })

    it('accepts a nested free-form metadata object', () => {
      const parsed = CreateCustomerAssetSchema.parse({
        assetType: 'VEHICLE',
        brandId: validBrandId,
        model: 'Civic',
        identifier: 'ABC-123',
        metadata: { engine: 'v6', doors: 4 },
      })
      expect(parsed.metadata).toEqual({ engine: 'v6', doors: 4 })
    })

    it('rejects an invalid assetType enum value', () => {
      expect(() =>
        CreateCustomerAssetSchema.parse({
          assetType: 'SPACESHIP',
          brandId: validBrandId,
          model: 'Civic',
          identifier: 'ABC-123',
        })
      ).toThrow()
    })

    it('rejects a country not exactly 2 chars', () => {
      expect(() =>
        CreateCustomerAssetSchema.parse({
          assetType: 'VEHICLE',
          brandId: validBrandId,
          model: 'Civic',
          identifier: 'ABC-123',
          country: 'MEX',
        })
      ).toThrow()
    })

    it('rejects a year outside 1900-2100', () => {
      expect(() =>
        CreateCustomerAssetSchema.parse({
          assetType: 'VEHICLE',
          brandId: validBrandId,
          model: 'Civic',
          identifier: 'ABC-123',
          year: 1800,
        })
      ).toThrow()
    })
  })

  describe('UpdateCustomerAssetSchema', () => {
    it('is the partial of the create schema', () => {
      expect(UpdateCustomerAssetSchema.parse({ color: 'red' })).toEqual({
        color: 'red',
      })
    })
  })

  describe('ListCustomerAssetsQuerySchema', () => {
    it('coerces page/limit and accepts assetType filter', () => {
      const parsed = ListCustomerAssetsQuerySchema.parse({
        page: '1',
        limit: '20',
        assetType: 'VEHICLE',
      })
      expect(parsed.page).toBe(1)
      expect(parsed.assetType).toBe('VEHICLE')
    })
  })
})
