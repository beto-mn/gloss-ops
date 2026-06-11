import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import { createTestApp, seedTenant, type SeededTenant } from './helpers'

// no shared schema yet — TODO publish InventoryRecordSchema in @glossops/shared
// (current InventoryItemSchema models a discriminated union by `type`, but the API returns a Prisma.InventoryModel
// with separate `inventoryItem`/`materialRoll` sub-records; either flatten the server payload or rework the schema)
interface InventoryItemRecord {
  id: string
  branchId: string
  type: 'ITEM' | 'ROLL'
  inventoryItem?: { unit: string; stock: string }
  materialRoll?: { series: string; remainingLength: string }
}

// no shared schema yet — TODO publish InventoryPageSchema in @glossops/shared
interface InventoryPageResponse {
  data: InventoryItemRecord[]
  meta: { total: number; page: number; limit: number }
}

describe('Inventory (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let itemId: string
  let rollId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /inventory/items — creates an inventory item', async () => {
    const res = await http
      .post('/inventory/items')
      .set(tenant.authHeaders)
      .send({
        name: 'Test Wax ' + Date.now(),
        unit: 'pza',
        stock: 10,
        unitCost: 100,
        lowStockAlert: 2,
      })
      .expect(201)

    // no shared schema yet — TODO publish InventoryRecordSchema in @glossops/shared
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        branchId: tenant.branchId,
        type: 'ITEM',
        inventoryItem: expect.objectContaining({ unit: 'pza' }) as unknown,
      })
    )
    itemId = (res.body as InventoryItemRecord).id
  })

  it('POST /inventory/material-rolls — creates a material roll', async () => {
    const res = await http
      .post('/inventory/material-rolls')
      .set(tenant.authHeaders)
      .send({
        name: 'Test Vinyl ' + Date.now(),
        series: 'Pro',
        finish: 'Gloss',
        color: 'Negro',
        width: 1.5,
        remainingLength: 30,
      })
      .expect(201)

    // no shared schema yet — TODO publish InventoryRecordSchema in @glossops/shared
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        branchId: tenant.branchId,
        type: 'ROLL',
        materialRoll: expect.objectContaining({
          series: 'Pro',
          remainingLength: '30',
        }) as unknown,
      })
    )
    rollId = (res.body as InventoryItemRecord).id
  })

  it('GET /inventory — lists all inventory for the branch', async () => {
    const res = await http.get('/inventory').set(tenant.authHeaders).expect(200)

    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.any(Array) as unknown,
        meta: expect.objectContaining({
          total: expect.any(Number) as unknown,
          page: expect.any(Number) as unknown,
          limit: expect.any(Number) as unknown,
        }) as unknown,
      })
    )
    // no shared schema yet — TODO publish InventoryPageSchema in @glossops/shared
    const page = res.body as InventoryPageResponse
    const ids = page.data.map(r => r.id)
    expect(ids).toEqual(expect.arrayContaining([itemId, rollId]))
  })

  it('GET /inventory?type=ITEM — filters by type', async () => {
    const res = await http
      .get('/inventory?type=ITEM')
      .set(tenant.authHeaders)
      .expect(200)

    const page = res.body as InventoryPageResponse
    page.data.forEach(r => expect(r.type).toBe('ITEM'))
  })

  it('PATCH /inventory/items/:id — updates an item', async () => {
    const res = await http
      .patch(`/inventory/items/${itemId}`)
      .set(tenant.authHeaders)
      .send({ stock: 20 })
      .expect(200)
    const record = res.body as InventoryItemRecord
    expect(record.inventoryItem?.stock).toBe('20')
  })

  it('PATCH /inventory/material-rolls/:id — updates a roll', async () => {
    const res = await http
      .patch(`/inventory/material-rolls/${rollId}`)
      .set(tenant.authHeaders)
      .send({ remainingLength: 25 })
      .expect(200)
    const record = res.body as InventoryItemRecord
    expect(record.materialRoll?.remainingLength).toBe('25')
  })

  it('GET /inventory/:id/usages — lists usages (empty initially)', async () => {
    const res = await http
      .get(`/inventory/${itemId}/usages`)
      .set(tenant.authHeaders)
      .expect(200)

    // no shared schema yet — TODO follow-up: publish InventoryUsageSchema in @glossops/shared
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('DELETE /inventory/items/:id — deletes (204)', async () => {
    await http
      .delete(`/inventory/items/${itemId}`)
      .set(tenant.authHeaders)
      .expect(204)
  })

  it('DELETE /inventory/material-rolls/:id — deletes (204)', async () => {
    await http
      .delete(`/inventory/material-rolls/${rollId}`)
      .set(tenant.authHeaders)
      .expect(204)
  })
})
