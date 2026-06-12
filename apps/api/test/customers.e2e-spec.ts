import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import { CustomerListItemSchema } from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const CustomerPageSchema = z.object({
  data: z.array(CustomerListItemSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

// no shared schema yet — TODO publish CustomerCreateResponseSchema in @glossops/shared
// (POST/GET/PATCH /customers return Prisma.CustomerModel; lacks activeWorkOrderCount field that CustomerSchema requires)
interface CustomerResponse {
  id: string
  firstName: string
  lastName: string
  organizationId: string
}

describe('Customers (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)
  })

  afterAll(async () => {
    await app.close()
  })

  let createdCustomerId: string

  it('POST /customers — creates a customer', async () => {
    const res = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: `cust-${Date.now()}@e2e.test`,
        phone: `+52 55 0000 ${Math.floor(Math.random() * 10000)}`,
      })
      .expect(201)

    // no shared schema yet — TODO publish CustomerCreateResponseSchema in @glossops/shared (lacks activeWorkOrderCount that CustomerSchema requires)
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: tenant.organizationId,
      })
    )
    createdCustomerId = (res.body as CustomerResponse).id
  })

  it('GET /customers — lists customers with pagination (CustomerListItemSchema)', async () => {
    const res = await http.get('/customers').set(tenant.authHeaders)
    const page = parseWith(CustomerPageSchema)(res)
    expect(page.data.some(c => c.id === createdCustomerId)).toBe(true)
  })

  it('GET /customers?status=ACTIVE — applies status filter', async () => {
    const res = await http
      .get('/customers?status=ACTIVE')
      .set(tenant.authHeaders)
    const page = parseWith(CustomerPageSchema)(res)
    page.data.forEach(c => expect(c.status).toBe('ACTIVE'))
  })

  it('GET /customers/:id — returns customer detail', async () => {
    const res = await http
      .get(`/customers/${createdCustomerId}`)
      .set(tenant.authHeaders)
      .expect(200)

    // no shared schema yet — TODO follow-up: GET /customers/:id returns raw Prisma.CustomerModel (no activeWorkOrderCount)
    expect(res.body).toEqual(
      expect.objectContaining({
        id: createdCustomerId,
        firstName: 'John',
      })
    )
  })

  it('PATCH /customers/:id — updates a customer', async () => {
    const res = await http
      .patch(`/customers/${createdCustomerId}`)
      .set(tenant.authHeaders)
      .send({ firstName: 'Johnathan' })
      .expect(200)

    // no shared schema yet — TODO publish CustomerCreateResponseSchema in @glossops/shared
    expect((res.body as CustomerResponse).firstName).toBe('Johnathan')
  })

  it('DELETE /customers/:id — soft deletes (204) and disappears from active list', async () => {
    await http
      .delete(`/customers/${createdCustomerId}`)
      .set(tenant.authHeaders)
      .expect(204)

    const res = await http.get('/customers').set(tenant.authHeaders)
    const page = parseWith(CustomerPageSchema)(res)
    expect(page.data.find(c => c.id === createdCustomerId)).toBeUndefined()
  })
})
