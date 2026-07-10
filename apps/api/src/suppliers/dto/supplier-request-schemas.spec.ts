import {
  ListSuppliersQuerySchema,
  CreateSupplierSchema,
  UpdateSupplierSchema,
} from '@glossops/shared'

describe('Supplier request schemas', () => {
  describe('CreateSupplierSchema', () => {
    it('parses a valid create payload', () => {
      const parsed = CreateSupplierSchema.parse({ name: 'Avery Dennison MX' })
      expect(parsed.name).toBe('Avery Dennison MX')
    })

    it('rejects a missing name', () => {
      expect(() => CreateSupplierSchema.parse({})).toThrow()
    })

    it('rejects an invalid email', () => {
      expect(() =>
        CreateSupplierSchema.parse({ name: 'X', email: 'nope' })
      ).toThrow()
    })
  })

  describe('UpdateSupplierSchema', () => {
    it('is the partial of the create schema', () => {
      expect(UpdateSupplierSchema.parse({})).toEqual({})
      expect(UpdateSupplierSchema.parse({ name: 'New' })).toEqual({
        name: 'New',
      })
    })
  })

  describe('ListSuppliersQuerySchema', () => {
    it('coerces page/limit query params to numbers', () => {
      const parsed = ListSuppliersQuerySchema.parse({ page: '2', limit: '50' })
      expect(parsed.page).toBe(2)
      expect(parsed.limit).toBe(50)
    })

    it('rejects a limit above 100', () => {
      expect(() => ListSuppliersQuerySchema.parse({ limit: '500' })).toThrow()
    })
  })
})
