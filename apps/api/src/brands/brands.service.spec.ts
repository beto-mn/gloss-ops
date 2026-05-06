import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { Prisma } from '@glossops/database'

import { InMemoryBrandRepository } from './infrastructure/in-memory-brand.repository'
import { BrandsService } from './brands.service'
import { BRAND_REPOSITORY } from './brands.tokens'

const ORG = 'org-1'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  name: 'Avery Dennison',
  slug: 'avery-dennison',
  category: 'vinyl',
  ...overrides,
})

const makeSeeded = (
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

describe('BrandsService', () => {
  let service: BrandsService
  let repo: InMemoryBrandRepository

  beforeEach(async () => {
    repo = new InMemoryBrandRepository()
    const module = await Test.createTestingModule({
      providers: [{ provide: BRAND_REPOSITORY, useValue: repo }, BrandsService],
    }).compile()

    service = module.get(BrandsService)
  })

  describe('create', () => {
    it('creates and returns a brand', async () => {
      const brand = await service.create(ORG, makeData())
      expect(brand.name).toBe('Avery Dennison')
      expect(brand.isSeeded).toBe(false)
    })

    it('throws ConflictException when slug already exists', async () => {
      await service.create(ORG, makeData())
      await expect(service.create(ORG, makeData())).rejects.toThrow(
        ConflictException
      )
    })
  })

  describe('findAll', () => {
    it('returns paginated brands with defaults', async () => {
      await service.create(ORG, makeData())
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(1)
      expect(page.meta.page).toBe(1)
      expect(page.meta.limit).toBe(20)
    })

    it('includes seeded global brands', async () => {
      repo.seedGlobalBrands([makeSeeded()])
      const page = await service.findAll(ORG, {})
      expect(page.data.some(b => b.isSeeded)).toBe(true)
    })
  })

  describe('findOne', () => {
    it('returns the brand when it exists in org', async () => {
      const created = await service.create(ORG, makeData())
      const found = await service.findOne(created.id, ORG)
      expect(found.id).toBe(created.id)
    })

    it('returns a global seeded brand', async () => {
      const seeded = makeSeeded()
      repo.seedGlobalBrands([seeded])
      const found = await service.findOne(seeded.id, ORG)
      expect(found.isSeeded).toBe(true)
    })

    it('throws NotFoundException when brand does not exist', async () => {
      await expect(service.findOne('non-existent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when brand belongs to another org', async () => {
      const created = await repo.create('org-other', makeData())
      await expect(service.findOne(created.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates and returns the brand', async () => {
      const created = await service.create(ORG, makeData())
      const updated = await service.update(created.id, ORG, {
        name: 'Avery Pro',
      })
      expect(updated.name).toBe('Avery Pro')
    })

    it('throws NotFoundException when brand does not exist', async () => {
      await expect(
        service.update('non-existent', ORG, { name: 'X' })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when brand is seeded', async () => {
      const seeded = makeSeeded()
      repo.seedGlobalBrands([seeded])
      await expect(
        service.update(seeded.id, ORG, { name: 'Changed' })
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws ConflictException when new slug collides with another brand', async () => {
      const first = await service.create(ORG, makeData())
      await service.create(ORG, makeData({ name: 'XPEL', slug: 'xpel' }))
      await expect(
        service.update(first.id, ORG, { slug: 'xpel' })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('remove', () => {
    it('removes the brand successfully', async () => {
      const created = await service.create(ORG, makeData())
      await expect(service.remove(created.id, ORG)).resolves.toBeUndefined()
    })

    it('throws NotFoundException when brand does not exist', async () => {
      await expect(service.remove('non-existent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ForbiddenException when brand is seeded', async () => {
      const seeded = makeSeeded()
      repo.seedGlobalBrands([seeded])
      await expect(service.remove(seeded.id, ORG)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('throws ConflictException when brand has references', async () => {
      const created = await service.create(ORG, makeData())
      repo.seedInventory([{ id: 'inv-1', brandId: created.id }])
      await expect(service.remove(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })
  })
})
