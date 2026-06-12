import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import {
  WorkOrderCreateResponseSchema,
  CustomerCreateResponseSchema,
  AssetCheckpointSchema,
  CustomerAssetSchema,
  BrandSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const AssetCheckpointListSchema = z.array(AssetCheckpointSchema)

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
    const customerId = parseWith(CustomerCreateResponseSchema)(cRes).id

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
    workOrderId = parseWith(WorkOrderCreateResponseSchema)(woRes).id
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
    const checkpoint = parseWith(AssetCheckpointSchema)(res)
    expect(checkpoint.workOrderId).toBe(workOrderId)
    checkpointId = checkpoint.id
  })

  it('GET /work-orders/:id/checkpoints — lists checkpoints', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/checkpoints`)
      .set(tenant.authHeaders)
      .expect(200)

    const list = parseWith(AssetCheckpointListSchema)(res)
    expect(list.some(cp => cp.id === checkpointId)).toBe(true)
  })

  it('GET /work-orders/:id/checkpoints/:id — returns checkpoint detail', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/checkpoints/${checkpointId}`)
      .set(tenant.authHeaders)
      .expect(200)
    const checkpoint = parseWith(AssetCheckpointSchema)(res)
    expect(checkpoint.id).toBe(checkpointId)
  })

  it('PATCH /work-orders/:id/checkpoints/:id — updates a checkpoint', async () => {
    const res = await http
      .patch(`/work-orders/${workOrderId}/checkpoints/${checkpointId}`)
      .set(tenant.authHeaders)
      .send({ note: 'Updated note', generalCondition: 'EXCELLENT' })
      .expect(200)
    const checkpoint = parseWith(AssetCheckpointSchema)(res)
    expect(checkpoint.note).toBe('Updated note')
    expect(checkpoint.generalCondition).toBe('EXCELLENT')
  })

  it('DELETE /work-orders/:id/checkpoints/:id — deletes (204)', async () => {
    await http
      .delete(`/work-orders/${workOrderId}/checkpoints/${checkpointId}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
