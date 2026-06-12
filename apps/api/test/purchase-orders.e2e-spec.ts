import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  PurchaseOrderPageSchema,
  InventoryRecordSchema,
  PurchaseOrderSchema,
  SupplierSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

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
    inventoryId = parseWith(InventoryRecordSchema)(iRes).id
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

    const po = parseWith(PurchaseOrderSchema)(res)
    expect(po.branchId).toBe(tenant.branchId)
    expect(po.supplierId).toBe(supplierId)
    expect(po.status).toBe('DRAFT')
    expect(po.items).toHaveLength(1)
    // D7: Decimal fields on line items arrive as JS numbers after parsing
    expect(typeof po.items[0].unitCost).toBe('number')
    expect(typeof po.items[0].quantity).toBe('number')
    purchaseOrderId = po.id
  })

  it('GET /purchase-orders — lists POs', async () => {
    const res = await http
      .get('/purchase-orders')
      .set(tenant.authHeaders)
      .expect(200)

    const page = parseWith(PurchaseOrderPageSchema)(res)
    expect(page.data.some(p => p.id === purchaseOrderId)).toBe(true)
  })

  it('GET /purchase-orders/:id — returns PO detail with items', async () => {
    const res = await http
      .get(`/purchase-orders/${purchaseOrderId}`)
      .set(tenant.authHeaders)
      .expect(200)

    const po = parseWith(PurchaseOrderSchema)(res)
    expect(po.id).toBe(purchaseOrderId)
    expect(po.items.length).toBe(1)
  })

  it('PATCH /purchase-orders/:id — updates DRAFT PO note', async () => {
    const res = await http
      .patch(`/purchase-orders/${purchaseOrderId}`)
      .set(tenant.authHeaders)
      .send({ note: 'Updated note' })
      .expect(200)
    const po = parseWith(PurchaseOrderSchema)(res)
    expect(po.note).toBe('Updated note')
  })

  it('POST /purchase-orders/:id/receive — batch receive', async () => {
    const detailRes = await http
      .get(`/purchase-orders/${purchaseOrderId}`)
      .set(tenant.authHeaders)
    const detail = parseWith(PurchaseOrderSchema)(detailRes)
    const itemId = detail.items[0].id

    const res = await http
      .post(`/purchase-orders/${purchaseOrderId}/receive`)
      .set(tenant.authHeaders)
      .send({
        items: [{ itemId, receivedQuantity: 10 }],
      })
      .expect(201)
    const po = parseWith(PurchaseOrderSchema)(res)
    expect(po.status).toBe('RECEIVED')
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
    const draft = parseWith(PurchaseOrderSchema)(draftRes)

    const res = await http
      .post(`/purchase-orders/${draft.id}/cancel`)
      .set(tenant.authHeaders)
      .expect(201)
    const po = parseWith(PurchaseOrderSchema)(res)
    expect(po.status).toBe('CANCELLED')
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
    const tmp = parseWith(PurchaseOrderSchema)(tmpRes)

    await http
      .delete(`/purchase-orders/${tmp.id}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
