import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import { BranchSchema } from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const BranchPageSchema = z.object({
  data: z.array(BranchSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

describe('Branches (e2e)', () => {
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

  let createdBranchId: string

  it('POST /branches — creates a peer branch', async () => {
    const res = await http
      .post('/branches')
      .set(tenant.authHeaders)
      .send({ name: 'CDMX Peer ' + Date.now() })

    const branch = parseWith(BranchSchema)(res)
    expect(branch.organizationId).toBe(tenant.organizationId)
    createdBranchId = branch.id
  })

  it('GET /branches — lists branches with pagination', async () => {
    const res = await http.get('/branches').set(tenant.authHeaders)
    const page = parseWith(BranchPageSchema)(res)
    expect(page.data.length).toBeGreaterThanOrEqual(2)
    expect(page.data.some(b => b.id === createdBranchId)).toBe(true)
  })

  it('GET /branches/:id — returns branch detail', async () => {
    const res = await http
      .get(`/branches/${createdBranchId}`)
      .set(tenant.authHeaders)
    const branch = parseWith(BranchSchema)(res)
    expect(branch.id).toBe(createdBranchId)
  })

  it('PATCH /branches/:id — updates a branch', async () => {
    const res = await http
      .patch(`/branches/${createdBranchId}`)
      .set(tenant.authHeaders)
      .send({ address: '123 Test Ave' })

    const branch = parseWith(BranchSchema)(res)
    expect(branch.address).toBe('123 Test Ave')
  })

  it('DELETE /branches/:id — soft deletes a branch (204)', async () => {
    const tmpRes = await http
      .post('/branches')
      .set(tenant.authHeaders)
      .send({ name: 'Branch to Delete ' + Date.now() })
    const toDelete = parseWith(BranchSchema)(tmpRes)

    await http
      .delete(`/branches/${toDelete.id}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
