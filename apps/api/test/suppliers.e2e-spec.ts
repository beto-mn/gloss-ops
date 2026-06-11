import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import { SupplierSchema } from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const SupplierPageSchema = z.object({
  data: z.array(SupplierSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

describe('Suppliers (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let supplierId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /suppliers — creates supplier', async () => {
    const res = await http
      .post('/suppliers')
      .set(tenant.authHeaders)
      .send({
        name: 'Test Supplier ' + Date.now(),
        contactName: 'Jane',
        email: `supp-${Date.now()}@example.com`,
      })
    const supplier = parseWith(SupplierSchema)(res)
    expect(supplier.organizationId).toBe(tenant.organizationId)
    supplierId = supplier.id
  })

  it('GET /suppliers — lists suppliers', async () => {
    const res = await http.get('/suppliers').set(tenant.authHeaders)
    const page = parseWith(SupplierPageSchema)(res)
    expect(page.data.some(s => s.id === supplierId)).toBe(true)
  })

  it('GET /suppliers/:id — returns supplier detail', async () => {
    const res = await http
      .get(`/suppliers/${supplierId}`)
      .set(tenant.authHeaders)
    const supplier = parseWith(SupplierSchema)(res)
    expect(supplier.id).toBe(supplierId)
  })

  it('PATCH /suppliers/:id — updates supplier', async () => {
    const res = await http
      .patch(`/suppliers/${supplierId}`)
      .set(tenant.authHeaders)
      .send({ contactName: 'Janet' })
    const supplier = parseWith(SupplierSchema)(res)
    expect(supplier.contactName).toBe('Janet')
  })

  it('DELETE /suppliers/:id — deletes supplier', async () => {
    const tmpRes = await http
      .post('/suppliers')
      .set(tenant.authHeaders)
      .send({ name: 'To Delete ' + Date.now() })
    const tmp = parseWith(SupplierSchema)(tmpRes)
    await http
      .delete(`/suppliers/${tmp.id}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
