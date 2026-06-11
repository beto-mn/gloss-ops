import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import { BrandSchema, CustomerAssetSchema } from '@glossops/shared'

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

// no shared schema yet — TODO publish WorkOrderCreateResponseSchema in @glossops/shared
interface WorkOrderCreateResponse {
  id: string
}

// no shared schema yet — TODO publish MemberWithAccountSchema in @glossops/shared
interface MemberWithAccount {
  id: string
  accountId: string
}

// no shared schema yet — TODO publish WorkOrderAssignmentResponseSchema in @glossops/shared
// (current WorkOrderAssignmentSchema requires nested account object; controller returns flat repository record)
interface WorkOrderAssignmentResponse {
  id: string
  memberId: string
  role: string
  workOrderId: string
}

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
    const members = membersRes.body as MemberWithAccount[]
    const owner = members.find(m => m.accountId === tenant.accountId)
    if (!owner) throw new Error('owner member not found')
    memberId = owner.id

    // Build customer/brand/asset/WO scaffold
    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'Assign', lastName: 'Test' })
    const customerId = (cRes.body as CustomerCreateResponse).id

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
    workOrderId = (woRes.body as WorkOrderCreateResponse).id
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

    // no shared schema yet — TODO publish WorkOrderAssignmentResponseSchema in @glossops/shared
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        memberId,
        role: 'LEAD',
        workOrderId,
      })
    )
    assignmentId = (res.body as WorkOrderAssignmentResponse).id
  })

  it('GET /work-orders/:id/assignments — lists assignments', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/assignments`)
      .set(tenant.authHeaders)
      .expect(200)

    // no shared schema yet — TODO publish WorkOrderAssignmentResponseSchema in @glossops/shared
    const list = res.body as WorkOrderAssignmentResponse[]
    expect(Array.isArray(list)).toBe(true)
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
