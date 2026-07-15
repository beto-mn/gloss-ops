import { CreateWorkOrderAssignmentSchema } from '@glossops/shared'

const validUuid = 'd3f5a1b2-0000-4000-8000-000000000000'

describe('Work order assignment request schemas', () => {
  it('parses a valid payload with a role', () => {
    const parsed = CreateWorkOrderAssignmentSchema.parse({
      memberId: validUuid,
      role: 'LEAD',
    })
    expect(parsed.role).toBe('LEAD')
  })

  it('accepts an optional role (omitted)', () => {
    const parsed = CreateWorkOrderAssignmentSchema.parse({
      memberId: validUuid,
    })
    expect(parsed.role).toBeUndefined()
  })

  it('rejects an invalid role enum value', () => {
    expect(() =>
      CreateWorkOrderAssignmentSchema.parse({
        memberId: validUuid,
        role: 'MANAGER',
      })
    ).toThrow()
  })

  it('rejects a non-uuid memberId', () => {
    expect(() =>
      CreateWorkOrderAssignmentSchema.parse({ memberId: 'nope' })
    ).toThrow()
  })

  it('strips unknown keys', () => {
    const parsed = CreateWorkOrderAssignmentSchema.parse({
      memberId: validUuid,
      bogus: 1,
    }) as Record<string, unknown>
    expect(parsed.bogus).toBeUndefined()
  })
})
