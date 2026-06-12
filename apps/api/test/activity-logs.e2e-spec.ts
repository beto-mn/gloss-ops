import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  CustomerCreateResponseSchema,
  ActivityLogPageSchema,
  CustomerAssetSchema,
  BrandSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

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
    const customerId = parseWith(CustomerCreateResponseSchema)(cRes).id

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

  it('GET /activity-logs — lists logs with pagination, validated via ActivityLogPageSchema', async () => {
    const res = await http
      .get('/activity-logs?page=1&limit=20')
      .set(tenant.authHeaders)
      .expect(200)

    const page = parseWith(ActivityLogPageSchema)(res)
    expect(page.page).toBe(1)
    expect(page.limit).toBe(20)
    expect(page.data.length).toBeGreaterThanOrEqual(1)
    const wo = page.data.find(l => l.entity === 'WorkOrder')
    expect(wo).toBeDefined()
  })
})
