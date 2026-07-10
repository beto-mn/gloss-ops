import { describe, it, expect } from 'vitest'

import { AssetType } from '@glossops/shared'

import {
  createVehicleSchema,
  updateVehicleSchema,
} from './customer-asset.schema'

// Targets the web composition layer (`customer-asset.schema.ts`) over the
// shared `CreateCustomerAssetSchema` (with `metadata` omitted): Spanish
// messages for required fields and empty-string acceptance. `success` is
// asserted instead of `instanceof ZodError` (cross-realm zod instance).

describe('createVehicleSchema (web composition)', () => {
  it('parses valid vehicle', () => {
    const result = createVehicleSchema.parse({
      assetType: AssetType.VEHICLE,
      brandId: '00000000-0000-0000-0000-000000000001',
      model: 'Civic',
      identifier: 'ABC-123',
    })
    expect(result.model).toBe('Civic')
    expect(result.assetType).toBe(AssetType.VEHICLE)
  })

  it('rejects invalid brandId (not UUID)', () => {
    expect(
      createVehicleSchema.safeParse({
        assetType: AssetType.VEHICLE,
        brandId: 'not-a-uuid',
        model: 'Civic',
        identifier: 'ABC-123',
      }).success
    ).toBe(false)
  })

  it('rejects when model is empty', () => {
    expect(
      createVehicleSchema.safeParse({
        assetType: AssetType.VEHICLE,
        brandId: '00000000-0000-0000-0000-000000000001',
        model: '',
        identifier: 'ABC-123',
      }).success
    ).toBe(false)
  })

  it('rejects when identifier is empty', () => {
    expect(
      createVehicleSchema.safeParse({
        assetType: AssetType.VEHICLE,
        brandId: '00000000-0000-0000-0000-000000000001',
        model: 'Civic',
        identifier: '',
      }).success
    ).toBe(false)
  })
})

describe('updateVehicleSchema (web composition)', () => {
  it('parses partial input', () => {
    const result = updateVehicleSchema.parse({ model: 'Accord' })
    expect(result.model).toBe('Accord')
  })

  it('parses empty object', () => {
    expect(updateVehicleSchema.safeParse({}).success).toBe(true)
  })
})
