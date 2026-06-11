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

// no shared schema yet — TODO publish AssetCheckpointSchema in @glossops/shared
// (current schema declares photo as object but API returns array of URL strings)
interface AssetCheckpointResponse {
  id: string
  workOrderId: string
  type: string
  generalCondition: string
  note?: string
  photo: unknown
}

function expectCheckpointShape(
  body: unknown
): asserts body is AssetCheckpointResponse {
  expect(body).toEqual(
    expect.objectContaining({
      id: expect.any(String) as unknown,
      workOrderId: expect.any(String) as unknown,
      type: expect.any(String) as unknown,
      generalCondition: expect.any(String) as unknown,
    })
  )
}

describe('Asset Checkpoints (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let workOrderId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'CP', lastName: 'Test' })
    const customerId = (cRes.body as CustomerCreateResponse).id

    const bRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({
        name: 'CP Brand',
        slug: 'cp-' + Date.now(),
        category: 'VEHICLE',
      })
    const brandId = parseWith(BrandSchema)(bRes).id

    const aRes = await http
      .post(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
      .send({
        assetType: 'VEHICLE',
        brandId,
        model: 'CR-V',
        identifier: 'CP-' + Date.now(),
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

  let checkpointId: string

  it('POST /work-orders/:id/checkpoints — creates a checkpoint', async () => {
    const res = await http
      .post(`/work-orders/${workOrderId}/checkpoints`)
      .set(tenant.authHeaders)
      .send({
        type: 'RECEPTION',
        generalCondition: 'GOOD',
        mileage: 1000,
        fuelLevel: 'HALF',
      })
      .expect(201)
    expectCheckpointShape(res.body)
    expect(res.body.workOrderId).toBe(workOrderId)
    checkpointId = res.body.id
  })

  it('GET /work-orders/:id/checkpoints — lists checkpoints', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/checkpoints`)
      .set(tenant.authHeaders)
      .expect(200)

    const list = res.body as AssetCheckpointResponse[]
    expect(Array.isArray(list)).toBe(true)
    list.forEach((cp: unknown) => expectCheckpointShape(cp))
    expect(list.some(cp => cp.id === checkpointId)).toBe(true)
  })

  it('GET /work-orders/:id/checkpoints/:id — returns checkpoint detail', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/checkpoints/${checkpointId}`)
      .set(tenant.authHeaders)
      .expect(200)
    expectCheckpointShape(res.body)
    expect(res.body.id).toBe(checkpointId)
  })

  it('PATCH /work-orders/:id/checkpoints/:id — updates a checkpoint', async () => {
    const res = await http
      .patch(`/work-orders/${workOrderId}/checkpoints/${checkpointId}`)
      .set(tenant.authHeaders)
      .send({ note: 'Updated note', generalCondition: 'EXCELLENT' })
      .expect(200)
    expectCheckpointShape(res.body)
    expect(res.body.note).toBe('Updated note')
    expect(res.body.generalCondition).toBe('EXCELLENT')
  })

  it('DELETE /work-orders/:id/checkpoints/:id — deletes (204)', async () => {
    await http
      .delete(`/work-orders/${workOrderId}/checkpoints/${checkpointId}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
