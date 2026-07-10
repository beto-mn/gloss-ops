import { describe, it, expect } from 'vitest'

import { createServiceSchema, updateServiceSchema } from './service.schema'

// Targets the web composition layer (`service.schema.ts`) over the shared
// `CreateServiceSchema`: Spanish messages, `z.coerce.number()` on the numeric
// inputs, and empty-string acceptance for the optional strings. `success` is
// asserted instead of `instanceof ZodError` (cross-realm zod instance).

describe('createServiceSchema (web composition)', () => {
  it('parses valid service', () => {
    const result = createServiceSchema.parse({ name: 'Pulido', basePrice: 500 })
    expect(result.name).toBe('Pulido')
    expect(result.basePrice).toBe(500)
  })

  it('coerces string basePrice from the number input', () => {
    const result = createServiceSchema.parse({
      name: 'Pulido',
      basePrice: '500',
    })
    expect(result.basePrice).toBe(500)
  })

  it('rejects when name is empty', () => {
    expect(
      createServiceSchema.safeParse({ name: '', basePrice: 100 }).success
    ).toBe(false)
  })

  it('rejects when basePrice is negative', () => {
    expect(
      createServiceSchema.safeParse({ name: 'Pulido', basePrice: -1 }).success
    ).toBe(false)
  })

  it('rejects invalid claveProdServ characters', () => {
    expect(
      createServiceSchema.safeParse({
        name: 'Pulido',
        basePrice: 100,
        claveProdServ: 'ABC!@#',
      }).success
    ).toBe(false)
  })
})

describe('updateServiceSchema (web composition)', () => {
  it('parses partial input', () => {
    const result = updateServiceSchema.parse({ basePrice: 999 })
    expect(result.basePrice).toBe(999)
  })

  it('parses empty object', () => {
    expect(updateServiceSchema.safeParse({}).success).toBe(true)
  })
})
