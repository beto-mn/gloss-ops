import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  CustomerCreateResponseSchema,
  CustomerPageSchema,
  CustomerSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

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

    const created = parseWith(CustomerCreateResponseSchema)(res)
    expect(created.firstName).toBe('John')
    expect(created.lastName).toBe('Doe')
    expect(created.organizationId).toBe(tenant.organizationId)
    createdCustomerId = created.id
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

    const detail = parseWith(CustomerSchema)(res)
    expect(detail.id).toBe(createdCustomerId)
    expect(detail.firstName).toBe('John')
  })

  it('PATCH /customers/:id — updates a customer', async () => {
    const res = await http
      .patch(`/customers/${createdCustomerId}`)
      .set(tenant.authHeaders)
      .send({ firstName: 'Johnathan' })
      .expect(200)

    const updated = parseWith(CustomerSchema)(res)
    expect(updated.firstName).toBe('Johnathan')
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
