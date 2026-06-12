import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  WorkOrderCreateResponseSchema,
  CustomerCreateResponseSchema,
  CustomerAssetSchema,
  ServiceSchema,
  WarrantySchema,
  BrandSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

describe('Warranties (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let warrantyId: string
  let workOrderId: string
  let assetId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'War', lastName: 'Claim' })
    const customerId = parseWith(CustomerCreateResponseSchema)(cRes).id

    const bRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({
        name: 'War Brand',
        slug: 'war-' + Date.now(),
        category: 'VEHICLE',
      })
    const brandId = parseWith(BrandSchema)(bRes).id

    const aRes = await http
      .post(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
      .send({
        assetType: 'VEHICLE',
        brandId,
        model: 'Accord',
        identifier: 'WAR-' + Date.now(),
      })
    assetId = parseWith(CustomerAssetSchema)(aRes).id

    const sRes = await http
      .post('/services')
      .set(tenant.authHeaders)
      .send({
        name: 'War Svc ' + Date.now(),
        basePrice: 1000,
        warrantyDays: 365,
        warrantyDescription: 'Defects covered',
      })
    const serviceId = parseWith(ServiceSchema)(sRes).id

    const woRes = await http
      .post('/work-orders')
      .set(tenant.authHeaders)
      .send({
        assetId,
        type: 'STANDARD',
        items: [{ serviceId, quantity: 1, unitPrice: 1000 }],
      })
      .expect(201)
    workOrderId = parseWith(WorkOrderCreateResponseSchema)(woRes).id

    for (const status of ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']) {
      await http
        .patch(`/work-orders/${workOrderId}/status`)
        .set(tenant.authHeaders)
        .send({ status })
        .expect(200)
    }

    const wRes = await http
      .get(`/work-orders/${workOrderId}/warranties`)
      .set(tenant.authHeaders)
    warrantyId = (wRes.body as { id: string }[])[0].id
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /work-orders/:id/warranties — lists warranties for a work order (WarrantySchema[])', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/warranties`)
      .set(tenant.authHeaders)
      .expect(200)

    const list = res.body as unknown[]
    expect(Array.isArray(list)).toBe(true)
    list.forEach((w: unknown) => WarrantySchema.parse(w))
    expect(list.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /customer-assets/:id/warranties — lists warranties for an asset', async () => {
    const res = await http
      .get(`/customer-assets/${assetId}/warranties`)
      .set(tenant.authHeaders)
      .expect(200)

    const list = res.body as unknown[]
    expect(Array.isArray(list)).toBe(true)
    list.forEach((w: unknown) => WarrantySchema.parse(w))
  })

  it('GET /warranties/:id — returns warranty detail (WarrantySchema)', async () => {
    const res = await http
      .get(`/warranties/${warrantyId}`)
      .set(tenant.authHeaders)
    const w = parseWith(WarrantySchema)(res)
    expect(w.id).toBe(warrantyId)
  })

  it('POST /warranties/:id/void — voids a warranty', async () => {
    const res = await http
      .post(`/warranties/${warrantyId}/void`)
      .set(tenant.authHeaders)
      .send({ reason: 'Customer fault' })
    const w = parseWith(WarrantySchema)(res)
    expect(w.isVoid).toBe(true)
    expect(w.voidReason).toBe('Customer fault')
  })
})
