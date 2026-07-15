import {
  ListServicesQuerySchema,
  CreateServiceSchema,
  UpdateServiceSchema,
} from '@glossops/shared'

describe('Service request schemas', () => {
  describe('CreateServiceSchema', () => {
    it('parses a valid create payload', () => {
      const parsed = CreateServiceSchema.parse({
        name: 'Ceramic Coating Pro',
        basePrice: 1500,
        claveProdServ: '78101802',
      })
      expect(parsed.name).toBe('Ceramic Coating Pro')
      expect(parsed.basePrice).toBe(1500)
    })

    it('rejects a non-alphanumeric claveProdServ', () => {
      expect(() =>
        CreateServiceSchema.parse({ name: 'X', claveProdServ: 'AB-12' })
      ).toThrow()
    })

    it('rejects a negative basePrice', () => {
      expect(() =>
        CreateServiceSchema.parse({ name: 'X', basePrice: -1 })
      ).toThrow()
    })

    it('strips unknown keys', () => {
      const parsed = CreateServiceSchema.parse({
        name: 'X',
        extra: 'y',
      }) as Record<string, unknown>
      expect(parsed).not.toHaveProperty('extra')
    })
  })

  describe('UpdateServiceSchema', () => {
    it('is the partial of the create schema', () => {
      expect(UpdateServiceSchema.parse({})).toEqual({})
      expect(UpdateServiceSchema.parse({ name: 'New' })).toEqual({
        name: 'New',
      })
    })
  })

  describe('ListServicesQuerySchema', () => {
    it('coerces includeInactive="true" to boolean true', () => {
      const parsed = ListServicesQuerySchema.parse({ includeInactive: 'true' })
      expect(parsed.includeInactive).toBe(true)
    })

    it('coerces includeInactive="false" to boolean false', () => {
      const parsed = ListServicesQuerySchema.parse({ includeInactive: 'false' })
      expect(parsed.includeInactive).toBe(false)
    })

    it('leaves includeInactive undefined when absent', () => {
      const parsed = ListServicesQuerySchema.parse({})
      expect(parsed.includeInactive).toBeUndefined()
    })

    it('coerces page/limit query params to numbers', () => {
      const parsed = ListServicesQuerySchema.parse({ page: '2', limit: '50' })
      expect(parsed.page).toBe(2)
      expect(parsed.limit).toBe(50)
    })
  })
})
