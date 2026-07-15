import { VoidWarrantySchema } from '@glossops/shared'

describe('Warranty request schemas', () => {
  it('parses a valid void payload', () => {
    expect(VoidWarrantySchema.parse({ reason: 'Defective film' }).reason).toBe(
      'Defective film'
    )
  })

  it('rejects an empty reason', () => {
    expect(() => VoidWarrantySchema.parse({ reason: '' })).toThrow()
  })

  it('rejects a missing reason', () => {
    expect(() => VoidWarrantySchema.parse({})).toThrow()
  })

  it('strips unknown keys', () => {
    const parsed = VoidWarrantySchema.parse({
      reason: 'x',
      bogus: 1,
    }) as Record<string, unknown>
    expect(parsed.bogus).toBeUndefined()
  })
})
