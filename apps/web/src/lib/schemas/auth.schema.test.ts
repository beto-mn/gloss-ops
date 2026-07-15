import { describe, it, expect } from 'vitest'

import { loginSchema, registerSchema } from './auth.schema'

// These suites target the web composition layer (`auth.schema.ts`), which
// layers web-only concerns (min-length UX, `.email()`, the `confirmPassword`
// refinement, Spanish messages) on top of the shared `LoginSchema` /
// `RegisterSchema` field shape. `success` is asserted instead of
// `instanceof ZodError` because the schema is built with the zod instance
// bundled inside `@glossops/shared`, a different realm than the test's own.

describe('loginSchema (web composition of shared LoginSchema)', () => {
  it('parses valid credentials', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'securepass',
    })
    expect(result.email).toBe('user@example.com')
  })

  it('rejects invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'not-an-email', password: 'securepass' })
        .success
    ).toBe(false)
  })

  it('rejects password that is too short', () => {
    expect(
      loginSchema.safeParse({ email: 'user@example.com', password: 'short' })
        .success
    ).toBe(false)
  })
})

describe('registerSchema (web composition of shared RegisterSchema)', () => {
  const valid = {
    name: 'Ana García',
    email: 'ana@example.com',
    orgName: 'Mi Taller',
    password: 'password123',
    confirmPassword: 'password123',
  }

  it('parses valid registration', () => {
    const result = registerSchema.parse(valid)
    expect(result.name).toBe('Ana García')
  })

  it('rejects when passwords do not match (web-only refinement)', () => {
    expect(
      registerSchema.safeParse({ ...valid, confirmPassword: 'different' })
        .success
    ).toBe(false)
  })

  it('rejects when name is too short', () => {
    expect(registerSchema.safeParse({ ...valid, name: 'A' }).success).toBe(
      false
    )
  })

  it('rejects invalid email', () => {
    expect(
      registerSchema.safeParse({ ...valid, email: 'bad-email' }).success
    ).toBe(false)
  })
})
