import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  CustomerAssetSchema,
  BrandSchema,
  ServiceSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

// no shared schema yet — TODO publish CustomerCreateResponseSchema in @glossops/shared
interface CustomerCreateResponse {
  id: string
}

// no shared schema yet — TODO publish WorkOrderResponseSchema in @glossops/shared
// (POST/GET/PATCH return raw Prisma.WorkOrderModel; WorkOrderDetailSchema requires folio field that WorkOrder lacks)
interface WorkOrderResponse {
  id: string
  status: string
  type: string
  note?: string
  items: unknown[]
  total: number
  asset: { id: string }
  customer: { id: string }
}

// no shared schema yet — TODO publish WorkOrderListItemSchema in @glossops/shared aligned with current payload (drop folio)
interface WorkOrderListItem {
  id: string
}

// no shared schema yet — TODO publish WorkOrderPageSchema in @glossops/shared
interface WorkOrderPageResponse {
  data: WorkOrderListItem[]
  meta: { page: number; limit: number; total: number }
}

describe('Work Orders (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let customerId: string
  let assetId: string
  let serviceId: string
  let warrantyServiceId: string
  let workOrderId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'WO', lastName: 'Customer' })
    customerId = (cRes.body as CustomerCreateResponse).id

    const bRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({
        name: 'WO Brand',
        slug: 'wo-brand-' + Date.now(),
        category: 'VEHICLE',
      })
    const brandId = parseWith(BrandSchema)(bRes).id

    const aRes = await http
      .post(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
      .send({
        assetType: 'VEHICLE',
        brandId,
        model: 'Civic',
        identifier: 'WO-' + Date.now(),
      })
    assetId = parseWith(CustomerAssetSchema)(aRes).id

    const sRes = await http
      .post('/services')
      .set(tenant.authHeaders)
      .send({
        name: 'WO Service ' + Date.now(),
        basePrice: 1000,
      })
    serviceId = parseWith(ServiceSchema)(sRes).id

    const ws = await http
      .post('/services')
      .set(tenant.authHeaders)
      .send({
        name: 'WO Warranty Svc ' + Date.now(),
        basePrice: 2000,
        warrantyDays: 365,
        warrantyDescription: 'Defects covered',
      })
    warrantyServiceId = parseWith(ServiceSchema)(ws).id
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /work-orders — creates a DRAFT work order with items', async () => {
    const res = await http
      .post('/work-orders')
      .set(tenant.authHeaders)
      .send({
        assetId,
        type: 'STANDARD',
        items: [{ serviceId, quantity: 1, unitPrice: 1000 }],
      })
      .expect(201)

    // no shared schema yet — TODO publish WorkOrderResponseSchema in @glossops/shared
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        status: 'DRAFT',
        type: 'STANDARD',
      })
    )
    workOrderId = (res.body as WorkOrderResponse).id
  })

  it('GET /work-orders — lists work orders', async () => {
    const res = await http
      .get('/work-orders')
      .set(tenant.authHeaders)
      .expect(200)
    // no shared schema yet — TODO publish WorkOrderListItemSchema/WorkOrderPageSchema in @glossops/shared (drop folio)
    const page = res.body as WorkOrderPageResponse
    expect(page.data.some(w => w.id === workOrderId)).toBe(true)
    expect(page.meta).toEqual(
      expect.objectContaining({
        page: expect.any(Number) as unknown,
        limit: expect.any(Number) as unknown,
        total: expect.any(Number) as unknown,
      })
    )
  })

  it('GET /work-orders/:id — returns full detail', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}`)
      .set(tenant.authHeaders)
      .expect(200)
    // no shared schema yet — TODO publish WorkOrderResponseSchema in @glossops/shared (drop folio)
    expect(res.body).toEqual(
      expect.objectContaining({
        id: workOrderId,
        items: expect.any(Array) as unknown,
        total: expect.any(Number) as unknown,
        asset: expect.objectContaining({
          id: expect.any(String) as unknown,
        }) as unknown,
        customer: expect.objectContaining({
          id: expect.any(String) as unknown,
        }) as unknown,
      })
    )
    expect((res.body as WorkOrderResponse).items.length).toBeGreaterThanOrEqual(
      1
    )
  })

  it('PATCH /work-orders/:id — updates note', async () => {
    const res = await http
      .patch(`/work-orders/${workOrderId}`)
      .set(tenant.authHeaders)
      .send({ note: 'Adjusted' })
      .expect(200)
    // no shared schema yet — TODO publish WorkOrderResponseSchema in @glossops/shared
    expect((res.body as WorkOrderResponse).note).toBe('Adjusted')
  })

  it('PATCH /work-orders/:id/status — DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED, auto-generates warranty', async () => {
    const woRes = await http
      .post('/work-orders')
      .set(tenant.authHeaders)
      .send({
        assetId,
        type: 'STANDARD',
        items: [{ serviceId: warrantyServiceId, quantity: 1, unitPrice: 2000 }],
      })
      .expect(201)
    const woId = (woRes.body as WorkOrderResponse).id

    // DRAFT → CONFIRMED
    await http
      .patch(`/work-orders/${woId}/status`)
      .set(tenant.authHeaders)
      .send({ status: 'CONFIRMED' })
      .expect(200)

    // CONFIRMED → IN_PROGRESS
    await http
      .patch(`/work-orders/${woId}/status`)
      .set(tenant.authHeaders)
      .send({ status: 'IN_PROGRESS' })
      .expect(200)

    // IN_PROGRESS → COMPLETED
    const completedRes = await http
      .patch(`/work-orders/${woId}/status`)
      .set(tenant.authHeaders)
      .send({ status: 'COMPLETED' })
      .expect(200)

    // no shared schema yet — TODO publish WorkOrderResponseSchema in @glossops/shared
    expect((completedRes.body as WorkOrderResponse).status).toBe('COMPLETED')

    // Warranty auto-generated for items with warrantyDays > 0
    const warrantiesRes = await http
      .get(`/work-orders/${woId}/warranties`)
      .set(tenant.authHeaders)
      .expect(200)
    const warranties = warrantiesRes.body as unknown[]
    expect(Array.isArray(warranties)).toBe(true)
    expect(warranties.length).toBeGreaterThanOrEqual(1)
  })

  it('DELETE /work-orders/:id — deletes a DRAFT work order (204)', async () => {
    const tmpRes = await http
      .post('/work-orders')
      .set(tenant.authHeaders)
      .send({ assetId, type: 'STANDARD' })
      .expect(201)
    await http
      .delete(`/work-orders/${(tmpRes.body as WorkOrderResponse).id}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
