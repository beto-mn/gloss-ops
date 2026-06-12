import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import {
  WorkOrderAssignmentResponseSchema,
  WorkOrderCreateResponseSchema,
  CustomerCreateResponseSchema,
  MemberWithAccountSchema,
  CustomerAssetSchema,
  BrandSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const MemberWithAccountListSchema = z.array(MemberWithAccountSchema)
const WorkOrderAssignmentListSchema = z.array(WorkOrderAssignmentResponseSchema)

describe('Work Order Assignments (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let workOrderId: string
  let memberId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    // Resolve own organization member ID
    const membersRes = await http
      .get('/organizations/me/members')
      .set(tenant.authHeaders)
    const members = parseWith(MemberWithAccountListSchema)(membersRes)
    const owner = members.find(m => m.accountId === tenant.accountId)
    if (!owner) throw new Error('owner member not found')
    memberId = owner.id

    // Build customer/brand/asset/WO scaffold
    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'Assign', lastName: 'Test' })
    const customerId = parseWith(CustomerCreateResponseSchema)(cRes).id

    const bRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({
        name: 'Assign Brand',
        slug: 'asgn-' + Date.now(),
        category: 'VEHICLE',
      })
    const brandId = parseWith(BrandSchema)(bRes).id

    const aRes = await http
      .post(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
      .send({
        assetType: 'VEHICLE',
        brandId,
        model: 'Civic',
        identifier: 'ASG-' + Date.now(),
      })
    const assetId = parseWith(CustomerAssetSchema)(aRes).id

    const woRes = await http
      .post('/work-orders')
      .set(tenant.authHeaders)
      .send({ assetId, type: 'STANDARD' })
    workOrderId = parseWith(WorkOrderCreateResponseSchema)(woRes).id
  })

  afterAll(async () => {
    await app.close()
  })

  let assignmentId: string

  it('POST /work-orders/:id/assignments — assigns LEAD technician', async () => {
    const res = await http
      .post(`/work-orders/${workOrderId}/assignments`)
      .set(tenant.authHeaders)
      .send({ memberId, role: 'LEAD' })
      .expect(201)

    const assignment = parseWith(WorkOrderAssignmentResponseSchema)(res)
    expect(assignment.memberId).toBe(memberId)
    expect(assignment.role).toBe('LEAD')
    expect(assignment.workOrderId).toBe(workOrderId)
    assignmentId = assignment.id
  })

  it('GET /work-orders/:id/assignments — lists assignments', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/assignments`)
      .set(tenant.authHeaders)
      .expect(200)

    const list = parseWith(WorkOrderAssignmentListSchema)(res)
    expect(list.some(a => a.id === assignmentId)).toBe(true)
  })

  it('DELETE /work-orders/:id/assignments/:assignmentId — unassigns (204)', async () => {
    await http
      .delete(`/work-orders/${workOrderId}/assignments/${assignmentId}`)
      .set(tenant.authHeaders)
      .expect(204)
  })

  it('POST /work-orders/:id/assignments — 401 when no auth header', async () => {
    await http
      .post(`/work-orders/${workOrderId}/assignments`)
      .send({ memberId, role: 'LEAD' })
      .expect(401)
  })
})
