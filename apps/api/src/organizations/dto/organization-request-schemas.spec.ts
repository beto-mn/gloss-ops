import {
  UpdateOrganizationSchema,
  CreateInvitationSchema,
} from '@glossops/shared'

describe('Organization request schemas', () => {
  describe('UpdateOrganizationSchema', () => {
    it('accepts an empty payload (all fields optional)', () => {
      expect(UpdateOrganizationSchema.parse({})).toEqual({})
    })

    it('allows logoUrl to be explicitly null (clearing)', () => {
      expect(UpdateOrganizationSchema.parse({ logoUrl: null })).toEqual({
        logoUrl: null,
      })
    })

    it('strips unknown keys', () => {
      const parsed = UpdateOrganizationSchema.parse({
        name: 'Org',
        extra: 'x',
      }) as Record<string, unknown>
      expect(parsed).not.toHaveProperty('extra')
    })
  })

  describe('CreateInvitationSchema', () => {
    it('parses a valid invitation with explicit branchId', () => {
      const parsed = CreateInvitationSchema.parse({
        email: 'tech@glossops.com',
        role: 'TECHNICIAN',
        branchId: 'd3f5a1b2-0000-4000-8000-000000000000',
      })
      expect(parsed.role).toBe('TECHNICIAN')
    })

    it('rejects a non-uuid branchId', () => {
      expect(() =>
        CreateInvitationSchema.parse({
          email: 'tech@glossops.com',
          role: 'TECHNICIAN',
          branchId: 'not-a-uuid',
        })
      ).toThrow()
    })

    it('rejects an invalid role', () => {
      expect(() =>
        CreateInvitationSchema.parse({
          email: 'tech@glossops.com',
          role: 'SUPERADMIN',
          branchId: 'd3f5a1b2-0000-4000-8000-000000000000',
        })
      ).toThrow()
    })
  })
})
