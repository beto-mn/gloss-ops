import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { createCustomerSchema, updateCustomerSchema } from './customer.schema'

describe('createCustomerSchema', () => {
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

  it('throws ZodError when firstName is missing', () => {
    expect(() =>
      createCustomerSchema.parse({ firstName: '', lastName: 'García' })
    ).toThrow(ZodError)
  })

  it('throws ZodError when lastName is missing', () => {
    expect(() =>
      createCustomerSchema.parse({ firstName: 'Ana', lastName: '' })
    ).toThrow(ZodError)
  })

  it('throws ZodError for invalid email', () => {
    expect(() =>
      createCustomerSchema.parse({
        firstName: 'Ana',
        lastName: 'García',
        email: 'not-an-email',
      })
    ).toThrow(ZodError)
  })
})

describe('updateCustomerSchema', () => {
  it('parses partial input', () => {
    const result = updateCustomerSchema.parse({ firstName: 'Beto' })
    expect(result.firstName).toBe('Beto')
  })

  it('parses empty object', () => {
    expect(() => updateCustomerSchema.parse({})).not.toThrow()
  })
})
