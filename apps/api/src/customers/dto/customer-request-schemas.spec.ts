import {
  ListCustomersQuerySchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
} from '@glossops/shared'

describe('Customer request schemas', () => {
  describe('CreateCustomerSchema', () => {
    it('parses a valid create payload', () => {
      const parsed = CreateCustomerSchema.parse({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      })
      expect(parsed.firstName).toBe('John')
      expect(parsed.email).toBe('john@example.com')
    })

    it('rejects a payload missing a required field', () => {
      expect(() => CreateCustomerSchema.parse({ lastName: 'Doe' })).toThrow()
    })

    it('rejects a firstName longer than 100 chars', () => {
      expect(() =>
        CreateCustomerSchema.parse({
          firstName: 'a'.repeat(101),
          lastName: 'Doe',
        })
      ).toThrow()
    })

    it('strips unknown keys', () => {
      const parsed = CreateCustomerSchema.parse({
        firstName: 'John',
        lastName: 'Doe',
        unexpected: 'value',
      }) as Record<string, unknown>
      expect(parsed).not.toHaveProperty('unexpected')
    })
  })

  describe('UpdateCustomerSchema', () => {
    it('is the partial of the create schema (all fields optional)', () => {
      expect(UpdateCustomerSchema.parse({})).toEqual({})
      expect(UpdateCustomerSchema.parse({ firstName: 'Jane' })).toEqual({
        firstName: 'Jane',
      })
    })
  })

  describe('ListCustomersQuerySchema', () => {
    it('coerces string page/limit query params to numbers', () => {
      const parsed = ListCustomersQuerySchema.parse({ page: '2', limit: '50' })
      expect(parsed.page).toBe(2)
      expect(parsed.limit).toBe(50)
    })

    it('rejects a limit above 100', () => {
      expect(() => ListCustomersQuerySchema.parse({ limit: '500' })).toThrow()
    })

    it('accepts an empty query (all filters optional)', () => {
      expect(ListCustomersQuerySchema.parse({})).toEqual({})
    })

    it('rejects an invalid status enum value', () => {
      expect(() =>
        ListCustomersQuerySchema.parse({ status: 'PENDING' })
      ).toThrow()
    })
  })
})
