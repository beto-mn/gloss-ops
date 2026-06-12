import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import {
  InventoryRecordSchema,
  InventoryUsageSchema,
  InventoryPageSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const InventoryUsageListSchema = z.array(InventoryUsageSchema)

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

    const record = parseWith(InventoryRecordSchema)(res)
    expect(record.branchId).toBe(tenant.branchId)
    expect(record.type).toBe('ITEM')
    expect(record.inventoryItem?.unit).toBe('pza')
    // D7: Decimal field arrives as a JS number after parsing
    expect(typeof record.inventoryItem?.stock).toBe('number')
    expect(typeof record.unitCost).toBe('number')
    itemId = record.id
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

    const record = parseWith(InventoryRecordSchema)(res)
    expect(record.branchId).toBe(tenant.branchId)
    expect(record.type).toBe('ROLL')
    expect(record.materialRoll?.series).toBe('Pro')
    // D7: Decimal field on a roll item arrives as a JS number after parsing
    expect(typeof record.materialRoll?.remainingLength).toBe('number')
    expect(record.materialRoll?.remainingLength).toBe(30)
    rollId = record.id
  })

  it('GET /inventory — lists all inventory for the branch', async () => {
    const res = await http.get('/inventory').set(tenant.authHeaders).expect(200)

    const page = parseWith(InventoryPageSchema)(res)
    const ids = page.data.map(r => r.id)
    expect(ids).toEqual(expect.arrayContaining([itemId, rollId]))
  })

  it('GET /inventory?type=ITEM — filters by type', async () => {
    const res = await http
      .get('/inventory?type=ITEM')
      .set(tenant.authHeaders)
      .expect(200)

    const page = parseWith(InventoryPageSchema)(res)
    page.data.forEach(r => expect(r.type).toBe('ITEM'))
  })

  it('PATCH /inventory/items/:id — updates an item', async () => {
    const res = await http
      .patch(`/inventory/items/${itemId}`)
      .set(tenant.authHeaders)
      .send({ stock: 20 })
      .expect(200)
    const record = parseWith(InventoryRecordSchema)(res)
    expect(record.inventoryItem?.stock).toBe(20)
  })

  it('PATCH /inventory/material-rolls/:id — updates a roll', async () => {
    const res = await http
      .patch(`/inventory/material-rolls/${rollId}`)
      .set(tenant.authHeaders)
      .send({ remainingLength: 25 })
      .expect(200)
    const record = parseWith(InventoryRecordSchema)(res)
    expect(record.materialRoll?.remainingLength).toBe(25)
  })

  it('GET /inventory/:id/usages — lists usages (empty initially)', async () => {
    const res = await http
      .get(`/inventory/${itemId}/usages`)
      .set(tenant.authHeaders)
      .expect(200)

    const usages = parseWith(InventoryUsageListSchema)(res)
    expect(Array.isArray(usages)).toBe(true)
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
