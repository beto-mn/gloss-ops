import {
  CreateAssetCheckpointSchema,
  UpdateAssetCheckpointSchema,
} from '@glossops/shared'

describe('Asset checkpoint request schemas', () => {
  describe('CreateAssetCheckpointSchema', () => {
    it('parses a valid payload', () => {
      const parsed = CreateAssetCheckpointSchema.parse({
        type: 'RECEPTION',
        generalCondition: 'GOOD',
        fuelLevel: 'HALF',
        mileage: 12000,
        photo: ['https://example.com/a.jpg'],
      })
      expect(parsed.type).toBe('RECEPTION')
      expect(parsed.photo).toHaveLength(1)
    })

    it('rejects a missing required generalCondition', () => {
      expect(() =>
        CreateAssetCheckpointSchema.parse({ type: 'RECEPTION' })
      ).toThrow()
    })

    it('rejects an invalid enum value', () => {
      expect(() =>
        CreateAssetCheckpointSchema.parse({
          type: 'BOGUS',
          generalCondition: 'GOOD',
        })
      ).toThrow()
    })

    it('rejects a non-url photo entry', () => {
      expect(() =>
        CreateAssetCheckpointSchema.parse({
          type: 'RECEPTION',
          generalCondition: 'GOOD',
          photo: ['not-a-url'],
        })
      ).toThrow()
    })
  })

  describe('UpdateAssetCheckpointSchema', () => {
    it('accepts null to clear nullable fields', () => {
      const parsed = UpdateAssetCheckpointSchema.parse({
        mileage: null,
        fuelLevel: null,
        note: null,
        customerSignatureUrl: null,
      })
      expect(parsed.mileage).toBeNull()
      expect(parsed.fuelLevel).toBeNull()
    })

    it('accepts an empty (no-op) payload', () => {
      expect(UpdateAssetCheckpointSchema.parse({})).toEqual({})
    })
  })
})
