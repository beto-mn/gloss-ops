import { Test } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'

import { InMemoryCustomerRepository } from './infrastructure/in-memory-customer.repository'
import { CustomersService } from './customers.service'
import { CUSTOMER_REPOSITORY } from './customers.tokens'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  firstName: 'Ana',
  lastName: 'Pérez',
  ...overrides,
})

describe('CustomersService', () => {
  let service: CustomersService
  let repo: InMemoryCustomerRepository

  beforeEach(async () => {
    repo = new InMemoryCustomerRepository()
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: CUSTOMER_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(CustomersService)
  })

  describe('create', () => {
    it('creates and returns the customer', async () => {
      const customer = await service.create('org-1', makeData())
      expect(customer.firstName).toBe('Ana')
      expect(customer.organizationId).toBe('org-1')
    })

    it('throws ConflictException when email already exists in org', async () => {
      await repo.create('org-1', makeData({ email: 'taken@test.com' }))
      await expect(
        service.create('org-1', makeData({ email: 'taken@test.com' }))
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when phone already exists in org', async () => {
      await repo.create('org-1', makeData({ phone: '5559999' }))
      await expect(
        service.create(
          'org-1',
          makeData({ email: 'other@test.com', phone: '5559999' })
        )
      ).rejects.toThrow(ConflictException)
    })

    it('does not enforce uniqueness across different orgs', async () => {
      await repo.create('org-1', makeData({ email: 'shared@test.com' }))
      await expect(
        service.create('org-2', makeData({ email: 'shared@test.com' }))
      ).resolves.toBeDefined()
    })
  })

  describe('findAll', () => {
    it('returns paginated customers for the organization', async () => {
      await repo.create('org-1', makeData({ firstName: 'A' }))
      await repo.create('org-1', makeData({ firstName: 'B' }))
      const result = await service.findAll('org-1', {})
      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBe(2)
    })

    it('applies defaults: page=1, limit=20', async () => {
      const result = await service.findAll('org-1', {})
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })
  })

  describe('findOne', () => {
    it('returns customer when it belongs to the org', async () => {
      const created = await repo.create('org-1', makeData())
      const result = await service.findOne(created.id, 'org-1')
      expect(result.id).toBe(created.id)
    })

    it('throws NotFoundException when customer does not exist in the org', async () => {
      await expect(service.findOne('unknown', 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates and returns the customer', async () => {
      const created = await repo.create('org-1', makeData())
      const result = await service.update(created.id, 'org-1', {
        firstName: 'Updated',
      })
      expect(result.firstName).toBe('Updated')
    })

    it('throws NotFoundException when customer does not exist in the org', async () => {
      await expect(
        service.update('unknown', 'org-1', { firstName: 'X' })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when email conflicts with a DIFFERENT customer', async () => {
      const other = await repo.create(
        'org-1',
        makeData({ email: 'other@test.com', phone: '111' })
      )
      const target = await repo.create(
        'org-1',
        makeData({ email: 'target@test.com', phone: '222' })
      )
      await expect(
        service.update(target.id, 'org-1', { email: other.email! })
      ).rejects.toThrow(ConflictException)
    })

    it('does NOT throw ConflictException when email belongs to the SAME customer', async () => {
      const created = await repo.create(
        'org-1',
        makeData({ email: 'same@test.com' })
      )
      await expect(
        service.update(created.id, 'org-1', { email: 'same@test.com' })
      ).resolves.toBeDefined()
    })

    it('throws ConflictException when phone conflicts with a DIFFERENT customer', async () => {
      const other = await repo.create(
        'org-1',
        makeData({ phone: '9999', email: 'a@t.com' })
      )
      const target = await repo.create(
        'org-1',
        makeData({ phone: '8888', email: 'b@t.com' })
      )
      await expect(
        service.update(target.id, 'org-1', { phone: other.phone! })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('remove', () => {
    it('deletes the customer', async () => {
      const created = await repo.create('org-1', makeData())
      await service.remove(created.id, 'org-1')
      await expect(service.findOne(created.id, 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when customer does not exist in the org', async () => {
      await expect(service.remove('unknown', 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
