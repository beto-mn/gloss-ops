import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import { ServiceSchema } from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const ServicePageSchema = z.object({
  data: z.array(ServiceSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

describe('Services (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let serviceId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /services — creates a service', async () => {
    const res = await http
      .post('/services')
      .set(tenant.authHeaders)
      .send({
        name: 'Test Service ' + Date.now(),
        description: 'Coating',
        basePrice: 1500,
        warrantyDays: 365,
      })
    const svc = parseWith(ServiceSchema)(res)
    expect(svc.isActive).toBe(true)
    serviceId = svc.id
  })

  it('GET /services — lists services', async () => {
    const res = await http.get('/services').set(tenant.authHeaders)
    const page = parseWith(ServicePageSchema)(res)
    expect(page.data.some(s => s.id === serviceId)).toBe(true)
  })

  it('GET /services/:id — returns service detail', async () => {
    const res = await http.get(`/services/${serviceId}`).set(tenant.authHeaders)
    const svc = parseWith(ServiceSchema)(res)
    expect(svc.id).toBe(serviceId)
  })

  it('PATCH /services/:id — updates a service', async () => {
    const res = await http
      .patch(`/services/${serviceId}`)
      .set(tenant.authHeaders)
      .send({ description: 'Premium coating' })
    const svc = parseWith(ServiceSchema)(res)
    expect(svc.description).toBe('Premium coating')
  })

  it('POST /services/:id/deactivate — sets isActive=false', async () => {
    const res = await http
      .post(`/services/${serviceId}/deactivate`)
      .set(tenant.authHeaders)
    const svc = parseWith(ServiceSchema)(res)
    expect(svc.isActive).toBe(false)
  })

  it('POST /services/:id/activate — sets isActive=true', async () => {
    const res = await http
      .post(`/services/${serviceId}/activate`)
      .set(tenant.authHeaders)
    const svc = parseWith(ServiceSchema)(res)
    expect(svc.isActive).toBe(true)
  })

  it('DELETE /services/:id — route is not registered (404)', async () => {
    const tmpRes = await http
      .post('/services')
      .set(tenant.authHeaders)
      .send({ name: 'No Delete ' + Date.now() })
    const tmp = parseWith(ServiceSchema)(tmpRes)
    await http.delete(`/services/${tmp.id}`).set(tenant.authHeaders).expect(404)

    // The service still exists; consumers retire catalog entries via deactivate.
    await http.get(`/services/${tmp.id}`).set(tenant.authHeaders).expect(200)
  })
})
