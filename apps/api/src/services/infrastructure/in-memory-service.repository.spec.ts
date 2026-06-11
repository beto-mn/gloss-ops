import { ConflictException } from '@nestjs/common'

import { InMemoryServiceRepository } from './in-memory-service.repository'

const ORG = 'org-1'
const OTHER_ORG = 'org-2'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ceramic Coating Pro',
  ...overrides,
})

describe('InMemoryServiceRepository', () => {
  let repo: InMemoryServiceRepository

  beforeEach(() => {
    repo = new InMemoryServiceRepository()
  })

  describe('create', () => {
    it('creates and returns a service', async () => {
      const service = await repo.create(ORG, makeData())
      expect(service.organizationId).toBe(ORG)
      expect(service.name).toBe('Ceramic Coating Pro')
      expect(service.isActive).toBe(true)
    })

    it('sets optional fields to null when not provided', async () => {
      const service = await repo.create(ORG, makeData())
      expect(service.description).toBeNull()
      expect(service.claveProdServ).toBeNull()
      expect(service.claveUnidad).toBeNull()
      expect(service.warrantyDays).toBeNull()
      expect(service.warrantyDescription).toBeNull()
      expect(service.warrantyTerm).toBeNull()
    })

    it('stores basePrice as provided', async () => {
      const service = await repo.create(ORG, makeData({ basePrice: 15000 }))
      expect(Number(service.basePrice)).toBe(15000)
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
    it('returns the service when id and organizationId match', async () => {
      const created = await repo.create(ORG, makeData())
      const found = await repo.findById(created.id, ORG)
      expect(found?.id).toBe(created.id)
    })

    it('returns null when organizationId does not match', async () => {
      const created = await repo.create(ORG, makeData())
      const found = await repo.findById(created.id, OTHER_ORG)
      expect(found).toBeNull()
    })

    it('returns service even when inactive', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.deactivate(created.id, ORG)
      const found = await repo.findById(created.id, ORG)
      expect(found).not.toBeNull()
      expect(found?.isActive).toBe(false)
    })
  })

  describe('findAll', () => {
    const query = { includeInactive: false, page: 1, limit: 20 }

    it('returns active services by default', async () => {
      await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'PPF Full' }))
      const page = await repo.findAll(ORG, query)
      expect(page.data).toHaveLength(2)
    })

    it('excludes inactive services by default', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'PPF Full' }))
      await repo.deactivate(created.id, ORG)
      const page = await repo.findAll(ORG, query)
      expect(page.data).toHaveLength(1)
    })

    it('includes inactive services when includeInactive is true', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'PPF Full' }))
      await repo.deactivate(created.id, ORG)
      const page = await repo.findAll(ORG, { ...query, includeInactive: true })
      expect(page.data).toHaveLength(2)
    })

    it('excludes services from other orgs', async () => {
      await repo.create(ORG, makeData())
      await repo.create(OTHER_ORG, makeData())
      const page = await repo.findAll(ORG, query)
      expect(page.data).toHaveLength(1)
    })

    it('filters by search on name', async () => {
      await repo.create(ORG, makeData({ name: 'Ceramic Coating Pro' }))
      await repo.create(ORG, makeData({ name: 'PPF Full Body' }))
      const page = await repo.findAll(ORG, { ...query, search: 'ceramic' })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].name).toBe('Ceramic Coating Pro')
    })

    it('filters by search on description', async () => {
      await repo.create(
        ORG,
        makeData({ description: 'Protects against scratches' })
      )
      await repo.create(
        ORG,
        makeData({ name: 'PPF Full', description: 'Full body film' })
      )
      const page = await repo.findAll(ORG, { ...query, search: 'scratches' })
      expect(page.data).toHaveLength(1)
    })

    it('paginates correctly', async () => {
      for (let i = 1; i <= 5; i++) {
        await repo.create(ORG, makeData({ name: `Service ${i}` }))
      }
      const page = await repo.findAll(ORG, { ...query, page: 2, limit: 2 })
      expect(page.data).toHaveLength(2)
      expect(page.meta.page).toBe(2)
      expect(page.meta.total).toBe(5)
      expect(page.meta.hasNext).toBe(true)
      expect(page.meta.hasPrev).toBe(true)
    })
  })

  describe('update', () => {
    it('updates fields and returns updated service', async () => {
      const created = await repo.create(ORG, makeData())
      const updated = await repo.update(created.id, ORG, {
        name: 'Ceramic Elite',
      })
      expect(updated.name).toBe('Ceramic Elite')
    })

    it('throws ConflictException when new name collides with another service', async () => {
      const first = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'PPF Full' }))
      await expect(
        repo.update(first.id, ORG, { name: 'PPF Full' })
      ).rejects.toThrow(ConflictException)
    })

    it('allows updating name to its own current name', async () => {
      const created = await repo.create(ORG, makeData())
      await expect(
        repo.update(created.id, ORG, { name: 'Ceramic Coating Pro' })
      ).resolves.toBeDefined()
    })
  })

  describe('activate / deactivate', () => {
    it('deactivate sets isActive to false', async () => {
      const created = await repo.create(ORG, makeData())
      const result = await repo.deactivate(created.id, ORG)
      expect(result.isActive).toBe(false)
    })

    it('activate sets isActive to true', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.deactivate(created.id, ORG)
      const result = await repo.activate(created.id, ORG)
      expect(result.isActive).toBe(true)
    })
  })
})
