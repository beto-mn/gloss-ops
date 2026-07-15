import { describe, it, expect } from 'vitest'

import { WorkOrderType } from '@glossops/shared'

import {
  createWorkOrderItemSchema,
  createWorkOrderSchema,
  updateWorkOrderSchema,
} from './work-order.schema'

// Targets the web composition layer (`work-order.schema.ts`) over the shared
// `CreateWorkOrderSchema` / `CreateWorkOrderItemInlineSchema` /
// `UpdateWorkOrderSchema`: the form-only `customerId`, required `type`,
// required non-empty `items`, coerced numeric inputs, and empty-string
// handling. `success` is asserted instead of `instanceof ZodError`
// (cross-realm zod instance).

describe('createWorkOrderItemSchema (web composition)', () => {
  it('parses valid item', () => {
    const result = createWorkOrderItemSchema.parse({
      serviceId: 'svc-1',
      quantity: 2,
      unitPrice: 500,
    })
    expect(result.serviceId).toBe('svc-1')
    expect(result.quantity).toBe(2)
  })

  it('rejects when serviceId is empty', () => {
    expect(
      createWorkOrderItemSchema.safeParse({
        serviceId: '',
        quantity: 1,
        unitPrice: 100,
      }).success
    ).toBe(false)
  })

  it('rejects when quantity is 0', () => {
    expect(
      createWorkOrderItemSchema.safeParse({
        serviceId: 'svc-1',
        quantity: 0,
        unitPrice: 100,
      }).success
    ).toBe(false)
  })
})

describe('createWorkOrderSchema (web composition)', () => {
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

  it('rejects when customerId is missing (form-only field)', () => {
    expect(
      createWorkOrderSchema.safeParse({ ...validWO, customerId: '' }).success
    ).toBe(false)
  })

  it('rejects when items array is empty', () => {
    expect(
      createWorkOrderSchema.safeParse({ ...validWO, items: [] }).success
    ).toBe(false)
  })
})

describe('updateWorkOrderSchema (web composition)', () => {
  it('parses empty object', () => {
    expect(updateWorkOrderSchema.safeParse({}).success).toBe(true)
  })

  it('parses valid update data', () => {
    const result = updateWorkOrderSchema.parse({ note: 'Test note' })
    expect(result.note).toBe('Test note')
  })
})
