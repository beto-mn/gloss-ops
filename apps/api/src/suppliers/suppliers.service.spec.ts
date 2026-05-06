import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { InMemorySupplierRepository } from './infrastructure/in-memory-supplier.repository'
import { SuppliersService } from './suppliers.service'
import { SUPPLIER_REPOSITORY } from './suppliers.tokens'

const ORG = 'org-1'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  name: 'Avery Dennison MX',
  ...overrides,
})

describe('SuppliersService', () => {
  let service: SuppliersService
  let repo: InMemorySupplierRepository

  beforeEach(async () => {
    repo = new InMemorySupplierRepository()
    const module = await Test.createTestingModule({
      providers: [
        { provide: SUPPLIER_REPOSITORY, useValue: repo },
        SuppliersService,
      ],
    }).compile()

    service = module.get(SuppliersService)
  })

  describe('create', () => {
    it('creates and returns a supplier', async () => {
      const supplier = await service.create(ORG, makeData())
      expect(supplier.name).toBe('Avery Dennison MX')
    })

    it('throws ConflictException when name already exists', async () => {
      await service.create(ORG, makeData())
      await expect(service.create(ORG, makeData())).rejects.toThrow(
        ConflictException
      )
    })
  })

  describe('findAll', () => {
    it('returns paginated suppliers with defaults', async () => {
      await service.create(ORG, makeData())
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(1)
      expect(page.meta.page).toBe(1)
      expect(page.meta.limit).toBe(20)
    })

    it('applies search when provided', async () => {
      await service.create(ORG, makeData())
      await service.create(ORG, makeData({ name: '3M México' }))
      const page = await service.findAll(ORG, { search: '3m' })
      expect(page.data).toHaveLength(1)
    })
  })

  describe('findOne', () => {
    it('returns the supplier when it exists', async () => {
      const created = await service.create(ORG, makeData())
      const found = await service.findOne(created.id, ORG)
      expect(found.id).toBe(created.id)
    })

    it('throws NotFoundException when supplier does not exist', async () => {
      await expect(service.findOne('non-existent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when supplier belongs to another org', async () => {
      const created = await repo.create('org-other', makeData())
      await expect(service.findOne(created.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates and returns the supplier', async () => {
      const created = await service.create(ORG, makeData())
      const updated = await service.update(created.id, ORG, {
        name: 'Avery Elite',
      })
      expect(updated.name).toBe('Avery Elite')
    })

    it('throws NotFoundException when supplier does not exist', async () => {
      await expect(
        service.update('non-existent', ORG, { name: 'X' })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when new name collides with another supplier', async () => {
      const first = await service.create(ORG, makeData())
      await service.create(ORG, makeData({ name: '3M México' }))
      await expect(
        service.update(first.id, ORG, { name: '3M México' })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('remove', () => {
    it('removes the supplier successfully', async () => {
      const created = await service.create(ORG, makeData())
      await expect(service.remove(created.id, ORG)).resolves.toBeUndefined()
    })

    it('throws NotFoundException when supplier does not exist', async () => {
      await expect(service.remove('non-existent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when supplier has references', async () => {
      const created = await service.create(ORG, makeData())
      repo.seedInventory([{ id: 'inv-1', supplierId: created.id }])
      await expect(service.remove(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })
  })
})
