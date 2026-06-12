import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import { BrandSchema } from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const BrandPageSchema = z.object({
  data: z.array(BrandSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

describe('Brands (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let brandId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /brands — creates a brand', async () => {
    const slug = 'brand-' + Date.now()
    const res = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({ name: 'Test Brand', slug, category: 'VEHICLE' })
    const brand = parseWith(BrandSchema)(res)
    expect(brand.organizationId).toBe(tenant.organizationId)
    expect(brand.isSeeded).toBe(false)
    brandId = brand.id
  })

  it('GET /brands — lists brands (org-specific + seeded)', async () => {
    const res = await http.get('/brands').set(tenant.authHeaders)
    const page = parseWith(BrandPageSchema)(res)
    expect(page.data.some(b => b.id === brandId)).toBe(true)
  })

  it('GET /brands/:id — returns brand detail', async () => {
    const res = await http.get(`/brands/${brandId}`).set(tenant.authHeaders)
    const brand = parseWith(BrandSchema)(res)
    expect(brand.id).toBe(brandId)
  })

  it('PATCH /brands/:id — updates a brand', async () => {
    const res = await http
      .patch(`/brands/${brandId}`)
      .set(tenant.authHeaders)
      .send({ name: 'Updated Brand' })
    const brand = parseWith(BrandSchema)(res)
    expect(brand.name).toBe('Updated Brand')
  })

  it('DELETE /brands/:id — deletes brand (non-seeded)', async () => {
    const slug = 'brand-del-' + Date.now()
    const tmpRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({ name: 'To Delete', slug, category: 'VEHICLE' })
    const tmp = parseWith(BrandSchema)(tmpRes)
    await http.delete(`/brands/${tmp.id}`).set(tenant.authHeaders).expect(204)
  })

  it('PATCH /brands/:seededId — returns 403 brand_is_seeded for system brands', async () => {
    // Locate a seeded brand if any are present (depends on whether DB was seeded).
    const res = await http.get('/brands?limit=500').set(tenant.authHeaders)
    const page = parseWith(BrandPageSchema)(res)
    const seeded = page.data.find(b => b.isSeeded)
    if (!seeded) {
      // No seeded brands in the test DB — skip without failing.
      // (Migrations alone do not insert global brands; that happens via seed.ts.)
      return
    }
    const updateRes = await http
      .patch(`/brands/${seeded.id}`)
      .set(tenant.authHeaders)
      .send({ name: 'Should Fail' })
      .expect(403)
    expect(updateRes.body).toEqual(
      expect.objectContaining({ error: 'brand_is_seeded' })
    )
  })
})
