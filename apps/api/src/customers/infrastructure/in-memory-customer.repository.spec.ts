import { InMemoryCustomerRepository } from './in-memory-customer.repository'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@test.com',
  phone: '5551234567',
  ...overrides,
})

describe('InMemoryCustomerRepository', () => {
  let repo: InMemoryCustomerRepository

  beforeEach(() => {
    repo = new InMemoryCustomerRepository()
  })

  describe('create', () => {
    it('stores customer with correct organizationId and returns it', async () => {
      const customer = await repo.create('org-1', makeData())
      expect(customer.organizationId).toBe('org-1')
      expect(customer.firstName).toBe('Ana')
      expect(customer.id).toBeDefined()
    })
  })

  describe('findById', () => {
    it('returns customer when id and organizationId match', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findById(created.id, 'org-1')).toMatchObject({
        id: created.id,
      })
    })

    it('returns null when id belongs to a different organization', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findById(created.id, 'org-2')).toBeNull()
    })

    it('returns null when id does not exist', async () => {
      expect(await repo.findById('unknown', 'org-1')).toBeNull()
    })
  })

  describe('findAll', () => {
    it('returns only customers of the organization', async () => {
      await repo.create(
        'org-1',
        makeData({ firstName: 'A', email: 'a@t.com', phone: '111' })
      )
      await repo.create(
        'org-1',
        makeData({ firstName: 'B', email: 'b@t.com', phone: '222' })
      )
      await repo.create(
        'org-2',
        makeData({ firstName: 'C', email: 'c@t.com', phone: '333' })
      )
      const result = await repo.findAll('org-1', { page: 1, limit: 20 })
      expect(result.data).toHaveLength(2)
      expect(result.data.every((c) => c.organizationId === 'org-1')).toBe(true)
    })

    it('returns empty data and correct meta when org has no customers', async () => {
      const result = await repo.findAll('org-empty', { page: 1, limit: 20 })
      expect(result.data).toHaveLength(0)
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('filters by search term across fullName, email and phone', async () => {
      await repo.create(
        'org-1',
        makeData({
          firstName: 'Ana',
          lastName: 'López',
          email: 'ana@test.com',
          phone: '111',
        })
      )
      await repo.create(
        'org-1',
        makeData({
          firstName: 'Juan',
          lastName: 'García',
          email: 'juan@test.com',
          phone: '222',
        })
      )

      const byName = await repo.findAll('org-1', {
        search: 'ana',
        page: 1,
        limit: 20,
      })
      expect(byName.data).toHaveLength(1)
      expect(byName.data[0].firstName).toBe('Ana')

      const byEmail = await repo.findAll('org-1', {
        search: 'juan@test',
        page: 1,
        limit: 20,
      })
      expect(byEmail.data).toHaveLength(1)
      expect(byEmail.data[0].firstName).toBe('Juan')

      const byPhone = await repo.findAll('org-1', {
        search: '222',
        page: 1,
        limit: 20,
      })
      expect(byPhone.data).toHaveLength(1)
      expect(byPhone.data[0].firstName).toBe('Juan')
    })

    it('paginates correctly and computes meta', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create(
          'org-1',
          makeData({ firstName: `C${i}`, email: `c${i}@t.com`, phone: `${i}` })
        )
      }
      const page1 = await repo.findAll('org-1', { page: 1, limit: 2 })
      expect(page1.data).toHaveLength(2)
      expect(page1.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      })

      const page3 = await repo.findAll('org-1', { page: 3, limit: 2 })
      expect(page3.data).toHaveLength(1)
      expect(page3.meta).toMatchObject({
        page: 3,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      })
    })
  })

  describe('findByEmail', () => {
    it('returns customer when email matches in org', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findByEmail('ana@test.com', 'org-1')).toMatchObject({
        id: created.id,
      })
    })

    it('returns null when email belongs to a different org', async () => {
      await repo.create('org-1', makeData())
      expect(await repo.findByEmail('ana@test.com', 'org-2')).toBeNull()
    })

    it('returns null when email does not exist', async () => {
      expect(await repo.findByEmail('nobody@test.com', 'org-1')).toBeNull()
    })
  })

  describe('findByPhone', () => {
    it('returns customer when phone matches in org', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findByPhone('5551234567', 'org-1')).toMatchObject({
        id: created.id,
      })
    })

    it('returns null when phone belongs to a different org', async () => {
      await repo.create('org-1', makeData())
      expect(await repo.findByPhone('5551234567', 'org-2')).toBeNull()
    })

    it('returns null when phone does not exist', async () => {
      expect(await repo.findByPhone('9999999999', 'org-1')).toBeNull()
    })
  })

  describe('update', () => {
    it('updates fields and returns the updated customer', async () => {
      const created = await repo.create('org-1', makeData())
      const updated = await repo.update(created.id, 'org-1', {
        firstName: 'Updated',
      })
      expect(updated.firstName).toBe('Updated')
      expect(updated.lastName).toBe('Pérez')
    })

    it('rejects when customer does not belong to the organization', async () => {
      await expect(
        repo.update('unknown', 'org-1', { firstName: 'X' })
      ).rejects.toThrow('customer not found')
    })
  })

  describe('delete', () => {
    it('removes the customer from the store', async () => {
      const created = await repo.create('org-1', makeData())
      await repo.delete(created.id, 'org-1')
      expect(await repo.findById(created.id, 'org-1')).toBeNull()
    })

    it('rejects when customer does not belong to the organization', async () => {
      await expect(repo.delete('unknown', 'org-1')).rejects.toThrow(
        'customer not found'
      )
    })
  })
})
