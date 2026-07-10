import {
  ListBranchesQuerySchema,
  CreateBranchSchema,
  UpdateBranchSchema,
} from '@glossops/shared'

describe('Branch request schemas', () => {
  describe('CreateBranchSchema', () => {
    it('parses a valid create payload', () => {
      const parsed = CreateBranchSchema.parse({ name: 'Sucursal CDMX' })
      expect(parsed.name).toBe('Sucursal CDMX')
    })

    it('rejects a missing name', () => {
      expect(() => CreateBranchSchema.parse({})).toThrow()
    })

    it('rejects an invalid email', () => {
      expect(() =>
        CreateBranchSchema.parse({ name: 'X', email: 'nope' })
      ).toThrow()
    })
  })

  describe('UpdateBranchSchema', () => {
    it('is the partial of the create schema', () => {
      expect(UpdateBranchSchema.parse({})).toEqual({})
      expect(UpdateBranchSchema.parse({ name: 'New' })).toEqual({ name: 'New' })
    })
  })

  describe('ListBranchesQuerySchema', () => {
    it('coerces page/limit and accepts status filter', () => {
      const parsed = ListBranchesQuerySchema.parse({
        page: '2',
        limit: '10',
        status: 'ALL',
      })
      expect(parsed.page).toBe(2)
      expect(parsed.status).toBe('ALL')
    })

    it('rejects a limit above 100', () => {
      expect(() => ListBranchesQuerySchema.parse({ limit: '500' })).toThrow()
    })
  })
})
