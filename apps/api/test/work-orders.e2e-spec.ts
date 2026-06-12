import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  WorkOrderCreateResponseSchema,
  CustomerCreateResponseSchema,
  WorkOrderDetailSchema,
  CustomerAssetSchema,
  WorkOrderPageSchema,
  ServiceSchema,
  BrandSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

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
    customerId = parseWith(CustomerCreateResponseSchema)(cRes).id

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

    const created = parseWith(WorkOrderCreateResponseSchema)(res)
    expect(created.status).toBe('DRAFT')
    expect(created.type).toBe('STANDARD')
    workOrderId = created.id
  })

  it('GET /work-orders — lists work orders', async () => {
    const res = await http
      .get('/work-orders')
      .set(tenant.authHeaders)
      .expect(200)
    const page = parseWith(WorkOrderPageSchema)(res)
    expect(page.data.some(w => w.id === workOrderId)).toBe(true)
    expect(page.meta.page).toEqual(expect.any(Number))
    expect(page.meta.limit).toEqual(expect.any(Number))
    expect(page.meta.total).toEqual(expect.any(Number))
  })

  it('GET /work-orders/:id — returns full detail', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}`)
      .set(tenant.authHeaders)
      .expect(200)
    const detail = parseWith(WorkOrderDetailSchema)(res)
    expect(detail.id).toBe(workOrderId)
    expect(detail.items.length).toBeGreaterThanOrEqual(1)
    expect(detail.asset.id).toEqual(expect.any(String))
    expect(detail.customer.id).toEqual(expect.any(String))
    expect(typeof detail.total).toBe('number')
  })

  it('PATCH /work-orders/:id — updates note', async () => {
    const res = await http
      .patch(`/work-orders/${workOrderId}`)
      .set(tenant.authHeaders)
      .send({ note: 'Adjusted' })
      .expect(200)
    const updated = parseWith(WorkOrderCreateResponseSchema)(res)
    expect(updated.note).toBe('Adjusted')
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
    const woId = parseWith(WorkOrderCreateResponseSchema)(woRes).id

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

    const completed = parseWith(WorkOrderCreateResponseSchema)(completedRes)
    expect(completed.status).toBe('COMPLETED')

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
    const tmp = parseWith(WorkOrderCreateResponseSchema)(tmpRes)
    await http
      .delete(`/work-orders/${tmp.id}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
