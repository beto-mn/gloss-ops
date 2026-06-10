import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { createServiceSchema, updateServiceSchema } from './service.schema'

describe('createServiceSchema', () => {
  it('parses valid service', () => {
    const result = createServiceSchema.parse({ name: 'Pulido', basePrice: 500 })
    expect(result.name).toBe('Pulido')
    expect(result.basePrice).toBe(500)
  })

  it('throws ZodError when name is empty', () => {
    expect(() =>
      createServiceSchema.parse({ name: '', basePrice: 100 })
    ).toThrow(ZodError)
  })

  it('throws ZodError when basePrice is negative', () => {
    expect(() =>
      createServiceSchema.parse({ name: 'Pulido', basePrice: -1 })
    ).toThrow(ZodError)
  })

  it('throws ZodError for invalid claveProdServ characters', () => {
    expect(() =>
      createServiceSchema.parse({
        name: 'Pulido',
        basePrice: 100,
        claveProdServ: 'ABC!@#',
      })
    ).toThrow(ZodError)
  })
})

describe('updateServiceSchema', () => {
  it('parses partial input', () => {
    const result = updateServiceSchema.parse({ basePrice: 999 })
    expect(result.basePrice).toBe(999)
  })

  it('parses empty object', () => {
    expect(() => updateServiceSchema.parse({})).not.toThrow()
  })
})
