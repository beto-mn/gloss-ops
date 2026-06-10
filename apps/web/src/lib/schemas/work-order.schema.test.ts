import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { WorkOrderType } from '@glossops/shared'

import {
  createWorkOrderSchema,
  createWorkOrderItemSchema,
  updateWorkOrderSchema,
} from './work-order.schema'

describe('createWorkOrderItemSchema', () => {
  it('parses valid item', () => {
    const result = createWorkOrderItemSchema.parse({
      serviceId: 'svc-1',
      quantity: 2,
      unitPrice: 500,
    })
    expect(result.serviceId).toBe('svc-1')
    expect(result.quantity).toBe(2)
  })

  it('throws ZodError when serviceId is empty', () => {
    expect(() =>
      createWorkOrderItemSchema.parse({
        serviceId: '',
        quantity: 1,
        unitPrice: 100,
      })
    ).toThrow(ZodError)
  })

  it('throws ZodError when quantity is 0', () => {
    expect(() =>
      createWorkOrderItemSchema.parse({
        serviceId: 'svc-1',
        quantity: 0,
        unitPrice: 100,
      })
    ).toThrow(ZodError)
  })
})

describe('createWorkOrderSchema', () => {
  const validWO = {
    customerId: 'cust-1',
    assetId: 'asset-1',
    type: WorkOrderType.STANDARD,
    items: [{ serviceId: 'svc-1', quantity: 1, unitPrice: 100 }],
  }

  it('parses valid work order', () => {
    const result = createWorkOrderSchema.parse(validWO)
    expect(result.customerId).toBe('cust-1')
    expect(result.items).toHaveLength(1)
  })

  it('throws ZodError when customerId is missing', () => {
    expect(() =>
      createWorkOrderSchema.parse({ ...validWO, customerId: '' })
    ).toThrow(ZodError)
  })

  it('throws ZodError when items array is empty', () => {
    expect(() =>
      createWorkOrderSchema.parse({ ...validWO, items: [] })
    ).toThrow(ZodError)
  })
})

describe('updateWorkOrderSchema', () => {
  it('parses empty object', () => {
    expect(() => updateWorkOrderSchema.parse({})).not.toThrow()
  })

  it('parses valid update data', () => {
    const result = updateWorkOrderSchema.parse({ note: 'Test note' })
    expect(result.note).toBe('Test note')
  })
})
