import { describe, it, expect } from 'vitest'

import type { Warranty } from './warranty.schema'

describe('Warranty interface', () => {
  it('accepts a valid warranty shape', () => {
    const warranty: Warranty = {
      id: 'w-1',
      workOrderItemId: 'item-1',
      serviceId: 'svc-1',
      serviceName: 'Pulido',
      description: 'Garantía de pulido',
      term: '30 días',
      validFrom: '2026-01-01',
      validUntil: '2026-01-31',
      isVoid: false,
      voidReason: null,
      createdAt: '2026-01-01T00:00:00Z',
    }
    expect(warranty.id).toBe('w-1')
    expect(warranty.isVoid).toBe(false)
  })

  it('accepts a voided warranty', () => {
    const warranty: Warranty = {
      id: 'w-2',
      workOrderItemId: 'item-2',
      serviceId: 'svc-2',
      description: 'Garantía de pintura',
      term: null,
      validFrom: '2026-01-01',
      validUntil: '2026-03-01',
      isVoid: true,
      voidReason: 'Daño por accidente',
      createdAt: '2026-01-01T00:00:00Z',
    }
    expect(warranty.isVoid).toBe(true)
    expect(warranty.voidReason).toBe('Daño por accidente')
  })
})
