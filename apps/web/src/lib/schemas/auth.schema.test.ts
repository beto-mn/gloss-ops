import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { loginSchema, registerSchema } from './auth.schema'

describe('loginSchema', () => {
  it('parses valid credentials', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'securepass',
    })
    expect(result.email).toBe('user@example.com')
  })

  it('throws ZodError for invalid email', () => {
    expect(() =>
      loginSchema.parse({ email: 'not-an-email', password: 'securepass' })
    ).toThrow(ZodError)
  })

  it('throws ZodError when password is too short', () => {
    expect(() =>
      loginSchema.parse({ email: 'user@example.com', password: 'short' })
    ).toThrow(ZodError)
  })
})

describe('registerSchema', () => {
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

  it('throws ZodError when passwords do not match', () => {
    expect(() =>
      registerSchema.parse({ ...valid, confirmPassword: 'different' })
    ).toThrow(ZodError)
  })

  it('throws ZodError when name is too short', () => {
    expect(() => registerSchema.parse({ ...valid, name: 'A' })).toThrow(
      ZodError
    )
  })

  it('throws ZodError for invalid email', () => {
    expect(() =>
      registerSchema.parse({ ...valid, email: 'bad-email' })
    ).toThrow(ZodError)
  })
})
