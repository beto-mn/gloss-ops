import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { AssetType } from '@glossops/shared'

import {
  createVehicleSchema,
  updateVehicleSchema,
} from './customer-asset.schema'

describe('createVehicleSchema', () => {
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

  it('throws ZodError for invalid brandId (not UUID)', () => {
    expect(() =>
      createVehicleSchema.parse({
        assetType: AssetType.VEHICLE,
        brandId: 'not-a-uuid',
        model: 'Civic',
        identifier: 'ABC-123',
      })
    ).toThrow(ZodError)
  })

  it('throws ZodError when model is empty', () => {
    expect(() =>
      createVehicleSchema.parse({
        assetType: AssetType.VEHICLE,
        brandId: '00000000-0000-0000-0000-000000000001',
        model: '',
        identifier: 'ABC-123',
      })
    ).toThrow(ZodError)
  })

  it('throws ZodError when identifier is empty', () => {
    expect(() =>
      createVehicleSchema.parse({
        assetType: AssetType.VEHICLE,
        brandId: '00000000-0000-0000-0000-000000000001',
        model: 'Civic',
        identifier: '',
      })
    ).toThrow(ZodError)
  })
})

describe('updateVehicleSchema', () => {
  it('parses partial input', () => {
    const result = updateVehicleSchema.parse({ model: 'Accord' })
    expect(result.model).toBe('Accord')
  })

  it('parses empty object', () => {
    expect(() => updateVehicleSchema.parse({})).not.toThrow()
  })
})
