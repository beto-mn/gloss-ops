import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  CustomerCreateResponseSchema,
  CustomerAssetSchema,
  createPageSchema,
  BrandSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const CustomerAssetPageSchema = createPageSchema(CustomerAssetSchema)

describe('Customer Assets (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let customerId: string
  let brandId: string
  let assetId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'Owner', lastName: 'Of Asset' })
    customerId = parseWith(CustomerCreateResponseSchema)(cRes).id

    const bRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({
        name: 'Honda',
        slug: 'honda-' + Date.now(),
        category: 'VEHICLE',
      })
    brandId = parseWith(BrandSchema)(bRes).id
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /customers/:customerId/assets — creates a nested asset', async () => {
    const res = await http
      .post(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
      .send({
        assetType: 'VEHICLE',
        brandId,
        model: 'Civic',
        identifier: 'ABC-' + Date.now(),
      })

    // The controller returns 201 by default (no @HttpCode on @Post)
    expect(res.status).toBe(201)
    const asset = parseWith(CustomerAssetSchema)(res)
    expect(asset.customerId).toBe(customerId)
    assetId = asset.id
  })

  it('GET /customers/:customerId/assets — lists assets for a customer', async () => {
    const res = await http
      .get(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
    const page = parseWith(CustomerAssetPageSchema)(res)
    expect(page.data.some(a => a.id === assetId)).toBe(true)
  })

  it('GET /customer-assets/:id — returns asset detail', async () => {
    const res = await http
      .get(`/customer-assets/${assetId}`)
      .set(tenant.authHeaders)
    const asset = parseWith(CustomerAssetSchema)(res)
    expect(asset.id).toBe(assetId)
  })

  it('PATCH /customer-assets/:id — updates asset', async () => {
    const res = await http
      .patch(`/customer-assets/${assetId}`)
      .set(tenant.authHeaders)
      .send({ color: 'red' })
    const asset = parseWith(CustomerAssetSchema)(res)
    expect(asset.color).toBe('red')
  })

  it('DELETE /customer-assets/:id — soft deletes (204)', async () => {
    await http
      .delete(`/customer-assets/${assetId}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
