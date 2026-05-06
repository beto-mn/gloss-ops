import { ConflictException } from '@nestjs/common'

import { InMemorySupplierRepository } from './in-memory-supplier.repository'

const ORG = 'org-1'
const OTHER_ORG = 'org-2'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  name: 'Avery Dennison MX',
  ...overrides,
})

describe('InMemorySupplierRepository', () => {
  let repo: InMemorySupplierRepository

  beforeEach(() => {
    repo = new InMemorySupplierRepository()
  })

  describe('create', () => {
    it('creates and returns a supplier', async () => {
      const supplier = await repo.create(ORG, makeData())
      expect(supplier.organizationId).toBe(ORG)
      expect(supplier.name).toBe('Avery Dennison MX')
    })

    it('sets optional fields to null when not provided', async () => {
      const supplier = await repo.create(ORG, makeData())
      expect(supplier.contactName).toBeNull()
      expect(supplier.phone).toBeNull()
      expect(supplier.email).toBeNull()
      expect(supplier.note).toBeNull()
    })

    it('stores optional fields when provided', async () => {
      const supplier = await repo.create(
        ORG,
        makeData({ contactName: 'Carlos Ríos', email: 'carlos@avery.com' })
      )
      expect(supplier.contactName).toBe('Carlos Ríos')
      expect(supplier.email).toBe('carlos@avery.com')
    })

    it('throws ConflictException when name already exists in same org', async () => {
      await repo.create(ORG, makeData())
      await expect(repo.create(ORG, makeData())).rejects.toThrow(
        ConflictException
      )
    })

    it('allows same name in different org', async () => {
      await repo.create(ORG, makeData())
      await expect(repo.create(OTHER_ORG, makeData())).resolves.toBeDefined()
    })
  })

  describe('findById', () => {
    it('returns the supplier when id and organizationId match', async () => {
      const created = await repo.create(ORG, makeData())
      const found = await repo.findById(created.id, ORG)
      expect(found?.id).toBe(created.id)
    })

    it('returns null when organizationId does not match', async () => {
      const created = await repo.create(ORG, makeData())
      const found = await repo.findById(created.id, OTHER_ORG)
      expect(found).toBeNull()
    })

    it('returns null for unknown id', async () => {
      const found = await repo.findById('unknown-id', ORG)
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    const query = { page: 1, limit: 20 }

    it('returns suppliers for the org', async () => {
      await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: '3M México' }))
      const page = await repo.findAll(ORG, query)
      expect(page.data).toHaveLength(2)
    })

    it('excludes suppliers from other orgs', async () => {
      await repo.create(ORG, makeData())
      await repo.create(OTHER_ORG, makeData())
      const page = await repo.findAll(ORG, query)
      expect(page.data).toHaveLength(1)
    })

    it('filters by search on name', async () => {
      await repo.create(ORG, makeData({ name: 'Avery Dennison MX' }))
      await repo.create(ORG, makeData({ name: '3M México' }))
      const page = await repo.findAll(ORG, { ...query, search: 'avery' })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].name).toBe('Avery Dennison MX')
    })

    it('filters by search on contactName', async () => {
      await repo.create(ORG, makeData({ contactName: 'Carlos Ríos' }))
      await repo.create(
        ORG,
        makeData({ name: '3M México', contactName: 'Ana Pérez' })
      )
      const page = await repo.findAll(ORG, { ...query, search: 'carlos' })
      expect(page.data).toHaveLength(1)
    })

    it('filters by search on email', async () => {
      await repo.create(ORG, makeData({ email: 'ventas@avery.com.mx' }))
      await repo.create(
        ORG,
        makeData({ name: '3M México', email: 'info@3m.com' })
      )
      const page = await repo.findAll(ORG, { ...query, search: 'avery.com' })
      expect(page.data).toHaveLength(1)
    })

    it('paginates correctly', async () => {
      for (let i = 1; i <= 5; i++) {
        await repo.create(ORG, makeData({ name: `Supplier ${i}` }))
      }
      const page = await repo.findAll(ORG, { page: 2, limit: 2 })
      expect(page.data).toHaveLength(2)
      expect(page.meta.page).toBe(2)
      expect(page.meta.total).toBe(5)
      expect(page.meta.hasNext).toBe(true)
      expect(page.meta.hasPrev).toBe(true)
    })
  })

  describe('update', () => {
    it('updates fields and returns updated supplier', async () => {
      const created = await repo.create(ORG, makeData())
      const updated = await repo.update(created.id, ORG, {
        name: 'Avery Elite',
      })
      expect(updated.name).toBe('Avery Elite')
    })

    it('throws ConflictException when new name collides with another supplier', async () => {
      const first = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: '3M México' }))
      await expect(
        repo.update(first.id, ORG, { name: '3M México' })
      ).rejects.toThrow(ConflictException)
    })

    it('allows updating name to its own current name', async () => {
      const created = await repo.create(ORG, makeData())
      await expect(
        repo.update(created.id, ORG, { name: 'Avery Dennison MX' })
      ).resolves.toBeDefined()
    })
  })

  describe('delete', () => {
    it('removes the supplier', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.delete(created.id, ORG)
      const found = await repo.findById(created.id, ORG)
      expect(found).toBeNull()
    })

    it('throws ConflictException when supplier has inventory references', async () => {
      const created = await repo.create(ORG, makeData())
      repo.seedInventory([{ id: 'inv-1', supplierId: created.id }])
      await expect(repo.delete(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when supplier has purchaseOrder references', async () => {
      const created = await repo.create(ORG, makeData())
      repo.seedPurchaseOrders([{ id: 'po-1', supplierId: created.id }])
      await expect(repo.delete(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })

    it('succeeds when supplier has no references', async () => {
      const first = await repo.create(ORG, makeData())
      const second = await repo.create(ORG, makeData({ name: '3M México' }))
      repo.seedInventory([{ id: 'inv-1', supplierId: second.id }])
      await expect(repo.delete(first.id, ORG)).resolves.toBeUndefined()
    })
  })
})
