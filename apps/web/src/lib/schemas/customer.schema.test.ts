import { describe, it, expect } from 'vitest'

import { createCustomerSchema, updateCustomerSchema } from './customer.schema'

// Targets the web composition layer (`customer.schema.ts`) over the shared
// `CreateCustomerSchema`: Spanish required-name messages, the `.email()` UX
// check the shared body schema omits, and empty-string acceptance. `success`
// is asserted instead of `instanceof ZodError` (cross-realm zod instance).

describe('createCustomerSchema (web composition)', () => {
  it('parses valid input', () => {
    const result = createCustomerSchema.parse({
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@ejemplo.com',
      phone: '5551234567',
    })
    expect(result.firstName).toBe('Ana')
    expect(result.lastName).toBe('García')
  })

  it('accepts empty strings for optional fields', () => {
    const result = createCustomerSchema.parse({
      firstName: 'Ana',
      lastName: 'García',
      email: '',
      phone: '',
      note: '',
    })
    expect(result.email).toBe('')
  })

  it('rejects when firstName is missing', () => {
    expect(
      createCustomerSchema.safeParse({ firstName: '', lastName: 'García' })
        .success
    ).toBe(false)
  })

  it('rejects when lastName is missing', () => {
    expect(
      createCustomerSchema.safeParse({ firstName: 'Ana', lastName: '' }).success
    ).toBe(false)
  })

  it('rejects invalid email (web-only UX check)', () => {
    expect(
      createCustomerSchema.safeParse({
        firstName: 'Ana',
        lastName: 'García',
        email: 'not-an-email',
      }).success
    ).toBe(false)
  })
})

describe('updateCustomerSchema (web composition)', () => {
  it('parses partial input', () => {
    const result = updateCustomerSchema.parse({ firstName: 'Beto' })
    expect(result.firstName).toBe('Beto')
  })

  it('parses empty object', () => {
    expect(updateCustomerSchema.safeParse({}).success).toBe(true)
  })
})
