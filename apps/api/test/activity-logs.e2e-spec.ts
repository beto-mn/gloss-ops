import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  ActivityLogSchema,
  BrandSchema,
  CustomerAssetSchema,
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

// no shared schema yet — TODO publish ActivityLogPageSchema in @glossops/shared
interface ActivityLogPageResponse {
  data: { entity: string }[]
  total: number
  page: number
  limit: number
}

describe('Activity Logs (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    // Generate at least one activity log entry by creating a work order
    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'Act', lastName: 'Log' })
    const customerId = (cRes.body as CustomerCreateResponse).id

    const bRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({
        name: 'Act Brand',
        slug: 'act-' + Date.now(),
        category: 'VEHICLE',
      })
    const brandId = parseWith(BrandSchema)(bRes).id

    const aRes = await http
      .post(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
      .send({
        assetType: 'VEHICLE',
        brandId,
        model: 'Pilot',
        identifier: 'AL-' + Date.now(),
      })
    const assetId = parseWith(CustomerAssetSchema)(aRes).id

    await http
      .post('/work-orders')
      .set(tenant.authHeaders)
      .send({ assetId, type: 'STANDARD' })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /activity-logs — lists logs with pagination, validated via ActivityLogSchema', async () => {
    const res = await http
      .get('/activity-logs?page=1&limit=20')
      .set(tenant.authHeaders)
      .expect(200)

    // no shared schema yet for the page wrapper — TODO publish ActivityLogPageSchema in @glossops/shared (total/page/limit + data)
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.any(Array) as unknown,
        total: expect.any(Number) as unknown,
        page: 1,
        limit: 20,
      })
    )
    const body = res.body as ActivityLogPageResponse
    body.data.forEach((log: unknown) => ActivityLogSchema.parse(log))
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    const wo = body.data.find(l => l.entity === 'WorkOrder')
    expect(wo).toBeDefined()
  })
})
