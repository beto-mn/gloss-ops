import {
  ListBrandsQuerySchema,
  CreateBrandSchema,
  UpdateBrandSchema,
} from '@glossops/shared'

describe('Brand request schemas', () => {
  describe('CreateBrandSchema', () => {
    it('parses a valid create payload', () => {
      const parsed = CreateBrandSchema.parse({
        name: 'Toyota',
        slug: 'toyota',
        category: 'VEHICLE',
      })
      expect(parsed.slug).toBe('toyota')
      expect(parsed.category).toBe('VEHICLE')
    })

    it('rejects a non-kebab slug', () => {
      expect(() =>
        CreateBrandSchema.parse({
          name: 'Toyota',
          slug: 'Toyota Motors',
          category: 'VEHICLE',
        })
      ).toThrow()
    })

    it('rejects an invalid category enum value', () => {
      expect(() =>
        CreateBrandSchema.parse({
          name: 'Toyota',
          slug: 'toyota',
          category: 'SPACESHIP',
        })
      ).toThrow()
    })

    it('rejects a non-url logoUrl', () => {
      expect(() =>
        CreateBrandSchema.parse({
          name: 'Toyota',
          slug: 'toyota',
          category: 'VEHICLE',
          logoUrl: 'not-a-url',
        })
      ).toThrow()
    })
  })

  describe('UpdateBrandSchema', () => {
    it('is the partial of the create schema', () => {
      expect(UpdateBrandSchema.parse({})).toEqual({})
      expect(UpdateBrandSchema.parse({ name: 'New' })).toEqual({ name: 'New' })
    })
  })

  describe('ListBrandsQuerySchema', () => {
    it('allows a limit up to 500 (brands-specific cap)', () => {
      const parsed = ListBrandsQuerySchema.parse({ limit: '500' })
      expect(parsed.limit).toBe(500)
    })

    it('rejects a limit above 500', () => {
      expect(() => ListBrandsQuerySchema.parse({ limit: '501' })).toThrow()
    })

    it('coerces page and accepts category filter', () => {
      const parsed = ListBrandsQuerySchema.parse({
        page: '1',
        category: 'VEHICLE',
      })
      expect(parsed.page).toBe(1)
      expect(parsed.category).toBe('VEHICLE')
    })
  })
})
