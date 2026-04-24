import { InMemoryAccountRepository } from './in-memory-account.repository'

describe('InMemoryAccountRepository', () => {
  let repo: InMemoryAccountRepository

  beforeEach(() => {
    repo = new InMemoryAccountRepository()
  })

  describe('create', () => {
    it('returns account with generated id and provided fields', async () => {
      const result = await repo.create({
        email: 'a@b.com',
        passwordHash: 'hash',
        firstName: 'Ana',
        lastName: 'García',
      })
      expect(result.id).toBeDefined()
      expect(result.email).toBe('a@b.com')
      expect(result.passwordHash).toBe('hash')
    })
  })

  describe('findByEmail', () => {
    it('returns account when email matches', async () => {
      await repo.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      const result = await repo.findByEmail('a@b.com')
      expect(result?.email).toBe('a@b.com')
    })

    it('returns null when no account matches', async () => {
      expect(await repo.findByEmail('none@b.com')).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns account when id matches', async () => {
      const created = await repo.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      const result = await repo.findById(created.id)
      expect(result?.id).toBe(created.id)
    })

    it('returns null when id does not exist', async () => {
      expect(await repo.findById('nonexistent')).toBeNull()
    })
  })

  describe('seed', () => {
    it('pre-populates accounts accessible via findByEmail', async () => {
      repo.seed([
        {
          id: 'seeded-id',
          email: 'seeded@b.com',
          passwordHash: 'h',
          firstName: 'S',
          lastName: 'T',
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const result = await repo.findByEmail('seeded@b.com')
      expect(result?.id).toBe('seeded-id')
    })
  })
})
