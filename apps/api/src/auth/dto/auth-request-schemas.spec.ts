import {
  AcceptInvitationSchema,
  RegisterSchema,
  RefreshSchema,
  LoginSchema,
} from '@glossops/shared'

describe('Auth request schemas', () => {
  describe('LoginSchema', () => {
    it('parses a valid login payload', () => {
      const parsed = LoginSchema.parse({
        email: 'owner@glossops.com',
        password: 'secret',
      })
      expect(parsed.email).toBe('owner@glossops.com')
    })

    it('rejects an invalid email', () => {
      expect(() =>
        LoginSchema.parse({ email: 'nope', password: 'secret' })
      ).toThrow()
    })

    it('strips unknown keys', () => {
      const parsed = LoginSchema.parse({
        email: 'owner@glossops.com',
        password: 'secret',
        extra: 'x',
      }) as Record<string, unknown>
      expect(parsed).not.toHaveProperty('extra')
    })
  })

  describe('RegisterSchema', () => {
    it('parses a valid register payload', () => {
      const parsed = RegisterSchema.parse({
        email: 'owner@glossops.com',
        password: 'supersecret',
        name: 'John Doe',
        orgName: 'GlossOps Taller',
      })
      expect(parsed.orgName).toBe('GlossOps Taller')
    })

    it('rejects the auth e2e invalid body (bad email + short password)', () => {
      expect(() =>
        RegisterSchema.parse({ email: 'not-an-email', password: 'short' })
      ).toThrow()
    })

    it('rejects a password shorter than 8 chars', () => {
      expect(() =>
        RegisterSchema.parse({
          email: 'owner@glossops.com',
          password: 'short',
          name: 'John Doe',
          orgName: 'GlossOps',
        })
      ).toThrow()
    })
  })

  describe('RefreshSchema', () => {
    it('requires a refreshToken string', () => {
      expect(RefreshSchema.parse({ refreshToken: 'abc' })).toEqual({
        refreshToken: 'abc',
      })
      expect(() => RefreshSchema.parse({})).toThrow()
    })
  })

  describe('AcceptInvitationSchema', () => {
    it('requires token; profile fields are optional', () => {
      expect(AcceptInvitationSchema.parse({ token: 't' })).toEqual({
        token: 't',
      })
      expect(() => AcceptInvitationSchema.parse({})).toThrow()
    })
  })
})
