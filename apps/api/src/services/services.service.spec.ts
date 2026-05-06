import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { InMemoryServiceRepository } from './infrastructure/in-memory-service.repository'
import { ServicesService } from './services.service'
import { SERVICE_REPOSITORY } from './services.tokens'

const ORG = 'org-1'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ceramic Coating Pro',
  ...overrides,
})

describe('ServicesService', () => {
  let service: ServicesService
  let repo: InMemoryServiceRepository

  beforeEach(async () => {
    repo = new InMemoryServiceRepository()
    const module = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: SERVICE_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(ServicesService)
  })

  describe('create', () => {
    it('creates and returns the service', async () => {
      const result = await service.create(ORG, makeData())
      expect(result.name).toBe('Ceramic Coating Pro')
      expect(result.organizationId).toBe(ORG)
      expect(result.isActive).toBe(true)
    })

    it('propagates ConflictException when name already exists', async () => {
      await repo.create(ORG, makeData())
      await expect(service.create(ORG, makeData())).rejects.toThrow(
        ConflictException
      )
    })
  })

  describe('findAll', () => {
    it('returns only active services by default', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'PPF' }))
      await repo.deactivate(created.id, ORG)
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(1)
      expect(page.data[0].name).toBe('PPF')
    })

    it('returns all services when includeInactive is true', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'PPF' }))
      await repo.deactivate(created.id, ORG)
      const page = await service.findAll(ORG, { includeInactive: true })
      expect(page.data).toHaveLength(2)
    })

    it('applies default page and limit', async () => {
      const page = await service.findAll(ORG, {})
      expect(page.meta.page).toBe(1)
      expect(page.meta.limit).toBe(20)
    })
  })

  describe('findOne', () => {
    it('returns the service when found', async () => {
      const created = await repo.create(ORG, makeData())
      const found = await service.findOne(created.id, ORG)
      expect(found.id).toBe(created.id)
    })

    it('throws NotFoundException when service does not exist', async () => {
      await expect(service.findOne('nonexistent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('returns inactive service (findOne works regardless of isActive)', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.deactivate(created.id, ORG)
      const found = await service.findOne(created.id, ORG)
      expect(found.isActive).toBe(false)
    })

    it('throws NotFoundException for service in another org', async () => {
      const created = await repo.create(ORG, makeData())
      await expect(service.findOne(created.id, 'org-2')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates and returns the service', async () => {
      const created = await repo.create(ORG, makeData())
      const updated = await service.update(created.id, ORG, {
        name: 'Ceramic Elite',
      })
      expect(updated.name).toBe('Ceramic Elite')
    })

    it('throws NotFoundException when service does not exist', async () => {
      await expect(
        service.update('nonexistent', ORG, { name: 'X' })
      ).rejects.toThrow(NotFoundException)
    })

    it('propagates ConflictException when new name collides', async () => {
      const first = await repo.create(ORG, makeData())
      await repo.create(ORG, makeData({ name: 'PPF' }))
      await expect(
        service.update(first.id, ORG, { name: 'PPF' })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('activate', () => {
    it('activates an inactive service', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.deactivate(created.id, ORG)
      const result = await service.activate(created.id, ORG)
      expect(result.isActive).toBe(true)
    })

    it('throws ConflictException when service is already active', async () => {
      const created = await repo.create(ORG, makeData())
      await expect(service.activate(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws NotFoundException when service does not exist', async () => {
      await expect(service.activate('nonexistent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('deactivate', () => {
    it('deactivates an active service', async () => {
      const created = await repo.create(ORG, makeData())
      const result = await service.deactivate(created.id, ORG)
      expect(result.isActive).toBe(false)
    })

    it('throws ConflictException when service is already inactive', async () => {
      const created = await repo.create(ORG, makeData())
      await repo.deactivate(created.id, ORG)
      await expect(service.deactivate(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws NotFoundException when service does not exist', async () => {
      await expect(service.deactivate('nonexistent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('remove', () => {
    it('removes the service when it has no references', async () => {
      const created = await repo.create(ORG, makeData())
      await expect(service.remove(created.id, ORG)).resolves.toBeUndefined()
      await expect(service.findOne(created.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when service does not exist', async () => {
      await expect(service.remove('nonexistent', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('propagates ConflictException when service has references', async () => {
      const created = await repo.create(ORG, makeData())
      repo.seedWorkOrderItems([{ id: 'item-1', serviceId: created.id }])
      await expect(service.remove(created.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })
  })
})
