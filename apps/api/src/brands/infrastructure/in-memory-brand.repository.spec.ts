import { ConflictException } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import { InMemoryBrandRepository } from './in-memory-brand.repository'

const ORG = 'org-1'
const OTHER_ORG = 'org-2'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  name: 'Avery Dennison',
  slug: 'avery-dennison',
  category: 'vinyl',
  ...overrides,
})

const makeGlobal = (
  overrides: Partial<Prisma.BrandModel> = {}
): Prisma.BrandModel => ({
  id: 'global-1',
  organizationId: null,
  name: '3M',
  slug: '3m',
  category: 'vinyl',
  logoUrl: null,
  isSeeded: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('InMemoryBrandRepository', () => {
  let repo: InMemoryBrandRepository

  beforeEach(() => {
    repo = new InMemoryBrandRepository()
  })

  describe('create', () => {
    it('creates and returns a brand with correct org', async () => {
      const brand = await repo.create(ORG, makeData())
      expect(brand.organizationId).toBe(ORG)
      expect(brand.name).toBe('Avery Dennison')
      expect(brand.isSeeded).toBe(false)
    })

    it('sets optional logoUrl to null when not provided', async () => {
      const brand = await repo.create(ORG, makeData())
      expect(brand.logoUrl).toBeNull()
    })

    it('stores logoUrl when provided', async () => {
      const brand = await repo.create(
        ORG,
        makeData({ logoUrl: 'https://cdn.example.com/avery.png' })
      )
      expect(brand.logoUrl).toBe('https://cdn.example.com/avery.png')
    })

    it('throws ConflictException when slug already exists in same org', async () => {
      await repo.create(ORG, makeData())
      await expect(repo.create(ORG, makeData())).rejects.toThrow(
        ConflictException
      )
    })

    it('allows same slug in a different org', async () => {
      await repo.create(ORG, makeData())
      await expect(repo.create(OTHER_ORG, makeData())).resolves.toBeDefined()
    })

    it('allows same slug as a global seeded brand', async () => {
      repo.seedGlobalBrands([makeGlobal({ slug: 'avery-dennison' })])
      await expect(repo.create(ORG, makeData())).resolves.toBeDefined()
    })
  })

  describe('findById', () => {
    it('returns brand when id and organizationId match', async () => {
      const created = await repo.create(ORG, makeData())
      const found = await repo.findById(created.id, ORG)
      expect(found?.id).toBe(created.id)
    })

    it('returns global seeded brand regardless of org', async () => {
      const global = makeGlobal()
      repo.seedGlobalBrands([global])
      const found = await repo.findById(global.id, ORG)
      expect(found?.id).toBe(global.id)
      expect(found?.isSeeded).toBe(true)
    })

    it('returns null when brand belongs to another org and is not seeded', async () => {
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

    it('returns org-specific brands', async () => {
      await repo.create(ORG, makeData())
      const page = await repo.findAll(ORG, query)
      expect(page.data.some(b => b.name === 'Avery Dennison')).toBe(true)
    })

    it('includes global seeded brands', async () => {
      repo.seedGlobalBrands([makeGlobal()])
      const page = await repo.findAll(ORG, query)
      expect(page.data.some(b => b.isSeeded)).toBe(true)
    })

    it('excludes brands from other orgs', async () => {
      await repo.create(ORG, makeData())
      await repo.create(
        OTHER_ORG,
        makeData({ slug: 'other-brand', name: 'Other Brand' })
      )
      const page = await repo.findAll(ORG, query)
      expect(page.data.every(b => b.organizationId === ORG || b.isSeeded)).toBe(
        true
      )
    })

    it('filters by search on name (case-insensitive)', async () => {
      await repo.create(ORG, makeData())
      await repo.create(
        ORG,
        makeData({ name: 'XPEL', slug: 'xpel', category: 'ppf' })
      )
      const page = await repo.findAll(ORG, { ...query, search: 'avery' })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].name).toBe('Avery Dennison')
    })

    it('filters by category', async () => {
      await repo.create(ORG, makeData({ category: 'vinyl' }))
      await repo.create(
        ORG,
        makeData({ name: 'XPEL', slug: 'xpel', category: 'ppf' })
      )
      const page = await repo.findAll(ORG, { ...query, category: 'ppf' })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].name).toBe('XPEL')
    })

    it('paginates correctly', async () => {
      for (let i = 1; i <= 5; i++) {
        await repo.create(
          ORG,
          makeData({ name: `Brand ${i}`, slug: `brand-${i}` })
        )
      }
      const page = await repo.findAll(ORG, { page: 2, limit: 2 })
      expect(page.data).toHaveLength(2)
      expect(page.meta.page).toBe(2)
      expect(page.meta.total).toBe(5)
      expect(page.meta.hasNext).toBe(true)
      expect(page.meta.hasPrev).toBe(true)
    })

    it('orders results by name ASC', async () => {
      await repo.create(ORG, makeData({ name: 'Zebra Brand', slug: 'zebra' }))
      await repo.create(ORG, makeData({ name: 'Alpha Brand', slug: 'alpha' }))
      const page = await repo.findAll(ORG, query)
      expect(page.data[0].name).toBe('Alpha Brand')
      expect(page.data[1].name).toBe('Zebra Brand')
    })
  })

  describe('update', () => {
    it('updates fields and returns updated brand', async () => {
      const created = await repo.create(ORG, makeData())
      const updated = await repo.update(created.id, ORG, { name: 'Avery Pro' })
      expect(updated.name).toBe('Avery Pro')
    })

    it('throws ConflictException when new slug collides with another brand in org', async () => {
      const first = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'XPEL', slug: 'xpel' }))
      await expect(
        repo.update(first.id, ORG, { slug: 'xpel' })
      ).rejects.toThrow(ConflictException)
    })

    it('allows updating slug to its own current slug', async () => {
      const created = await repo.create(ORG, makeData())
      await expect(
        repo.update(created.id, ORG, { slug: 'avery-dennison' })
      ).resolves.toBeDefined()
    })
  })

  describe('delete', () => {
    it('removes the brand', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.delete(created.id, ORG)
      const found = await repo.findById(created.id, ORG)
      expect(found).toBeNull()
    })

    it('throws ConflictException when brand has customerAsset references', async () => {
      const created = await repo.create(ORG, makeData())
      repo.seedCustomerAssets([{ id: 'ca-1', brandId: created.id }])
      await expect(repo.delete(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when brand has inventory references', async () => {
      const created = await repo.create(ORG, makeData())
      repo.seedInventory([{ id: 'inv-1', brandId: created.id }])
      await expect(repo.delete(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })

    it('succeeds when brand has no references', async () => {
      const first = await repo.create(ORG, makeData())
      const second = await repo.create(
        ORG,
        makeData({ name: 'XPEL', slug: 'xpel' })
      )
      repo.seedInventory([{ id: 'inv-1', brandId: second.id }])
      await expect(repo.delete(first.id, ORG)).resolves.toBeUndefined()
    })
  })
})
