import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import { SupplierSchema } from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

// no shared schema yet — TODO publish InventoryRecordSchema in @glossops/shared
interface InventoryRecordResponse {
  id: string
}

// no shared schema yet — TODO publish PurchaseOrderResponseSchema in @glossops/shared
// (PurchaseOrderSchema does not include the items array the API returns)
interface PurchaseOrderItemResponse {
  id: string
}
interface PurchaseOrderResponse {
  id: string
  branchId: string
  supplierId: string
  status: string
  items: PurchaseOrderItemResponse[]
  note?: string
}

// no shared schema yet — TODO publish PurchaseOrderPageSchema in @glossops/shared
interface PurchaseOrderPageResponse {
  data: PurchaseOrderResponse[]
  meta: Record<string, unknown>
}

describe('Purchase Orders (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let supplierId: string
  let inventoryId: string
  let purchaseOrderId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    const sRes = await http
      .post('/suppliers')
      .set(tenant.authHeaders)
      .send({ name: 'PO Supplier ' + Date.now() })
    supplierId = parseWith(SupplierSchema)(sRes).id

    const iRes = await http
      .post('/inventory/items')
      .set(tenant.authHeaders)
      .send({ name: 'PO Item ' + Date.now(), unit: 'pza', stock: 0 })
      .expect(201)
    inventoryId = (iRes.body as InventoryRecordResponse).id
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /purchase-orders — creates a PO in DRAFT status', async () => {
    const res = await http
      .post('/purchase-orders')
      .set(tenant.authHeaders)
      .send({
        supplierId,
        items: [{ inventoryId, quantity: 10, unitCost: 50 }],
      })
      .expect(201)

    // no shared schema yet — TODO publish PurchaseOrderResponseSchema in @glossops/shared (current schema lacks items)
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        branchId: tenant.branchId,
        supplierId,
        status: 'DRAFT',
        items: expect.any(Array) as unknown,
      })
    )
    const po = res.body as PurchaseOrderResponse
    expect(po.items).toHaveLength(1)
    purchaseOrderId = po.id
  })

  it('GET /purchase-orders — lists POs', async () => {
    const res = await http
      .get('/purchase-orders')
      .set(tenant.authHeaders)
      .expect(200)

    // no shared schema yet — TODO publish PurchaseOrderPageSchema in @glossops/shared
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.any(Array) as unknown,
        meta: expect.any(Object) as unknown,
      })
    )
    const page = res.body as PurchaseOrderPageResponse
    expect(page.data.some(p => p.id === purchaseOrderId)).toBe(true)
  })

  it('GET /purchase-orders/:id — returns PO detail with items', async () => {
    const res = await http
      .get(`/purchase-orders/${purchaseOrderId}`)
      .set(tenant.authHeaders)
      .expect(200)

    // no shared schema yet — TODO publish PurchaseOrderResponseSchema in @glossops/shared
    const po = res.body as PurchaseOrderResponse
    expect(po.id).toBe(purchaseOrderId)
    expect(po.items.length).toBe(1)
  })

  it('PATCH /purchase-orders/:id — updates DRAFT PO note', async () => {
    const res = await http
      .patch(`/purchase-orders/${purchaseOrderId}`)
      .set(tenant.authHeaders)
      .send({ note: 'Updated note' })
      .expect(200)
    expect((res.body as PurchaseOrderResponse).note).toBe('Updated note')
  })

  it('POST /purchase-orders/:id/receive — batch receive', async () => {
    const detailRes = await http
      .get(`/purchase-orders/${purchaseOrderId}`)
      .set(tenant.authHeaders)
    const itemId = (detailRes.body as PurchaseOrderResponse).items[0].id

    const res = await http
      .post(`/purchase-orders/${purchaseOrderId}/receive`)
      .set(tenant.authHeaders)
      .send({
        items: [{ itemId, receivedQuantity: 10 }],
      })
      .expect(201)
    expect((res.body as PurchaseOrderResponse).status).toBe('RECEIVED')
  })

  it('POST /purchase-orders/:id/cancel — cancels a PO', async () => {
    const draftRes = await http
      .post('/purchase-orders')
      .set(tenant.authHeaders)
      .send({
        supplierId,
        items: [{ inventoryId, quantity: 5, unitCost: 50 }],
      })
      .expect(201)

    const res = await http
      .post(
        `/purchase-orders/${(draftRes.body as PurchaseOrderResponse).id}/cancel`
      )
      .set(tenant.authHeaders)
      .expect(201)
    expect((res.body as PurchaseOrderResponse).status).toBe('CANCELLED')
  })

  it('DELETE /purchase-orders/:id — deletes a DRAFT PO (204)', async () => {
    const tmpRes = await http
      .post('/purchase-orders')
      .set(tenant.authHeaders)
      .send({
        supplierId,
        items: [{ inventoryId, quantity: 2, unitCost: 50 }],
      })
      .expect(201)

    await http
      .delete(`/purchase-orders/${(tmpRes.body as PurchaseOrderResponse).id}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
