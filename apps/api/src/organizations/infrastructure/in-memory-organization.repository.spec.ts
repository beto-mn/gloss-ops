import { Role } from '@glossops/database'

import { InMemoryOrganizationRepository } from './in-memory-organization.repository'

const makeAccount = (id: string, email = `${id}@test.com`) => ({
  id,
  email,
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
})

describe('InMemoryOrganizationRepository', () => {
  let repo: InMemoryOrganizationRepository

  beforeEach(() => {
    repo = new InMemoryOrganizationRepository()
  })

  describe('createWithBranch', () => {
    it('creates org, a main branch, and an OWNER member for the given account', async () => {
      const { organization, member } = await repo.createWithBranch(
        { name: 'Taller', slug: 'taller' },
        'acc-1'
      )
      expect(organization.name).toBe('Taller')
      expect(organization.slug).toBe('taller')
      expect(member.accountId).toBe('acc-1')
      expect(member.role).toBe(Role.OWNER)
    })
  })

  describe('findById', () => {
    it('returns org when id matches', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      expect(await repo.findById(organization.id)).toMatchObject({
        id: organization.id,
      })
    })

    it('returns null when not found', async () => {
      expect(await repo.findById('unknown')).toBeNull()
    })
  })

  describe('findAllByAccountId', () => {
    it('returns orgs the account is a member of with their role', async () => {
      await repo.createWithBranch({ name: 'A', slug: 'a' }, 'acc-1')
      await repo.createWithBranch({ name: 'B', slug: 'b' }, 'acc-1')
      const orgs = await repo.findAllByAccountId('acc-1')
      expect(orgs).toHaveLength(2)
      expect(orgs[0].role).toBe(Role.OWNER)
    })

    it('returns empty array when account has no memberships', async () => {
      expect(await repo.findAllByAccountId('nobody')).toEqual([])
    })
  })

  describe('findMember', () => {
    it('returns member when account belongs to org', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const member = await repo.findMember('acc-1', organization.id)
      expect(member?.accountId).toBe('acc-1')
    })

    it('returns null when account is not a member', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      expect(await repo.findMember('other-acc', organization.id)).toBeNull()
    })
  })

  describe('update', () => {
    it('updates org name', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'Old', slug: 's' },
        'acc-1'
      )
      const updated = await repo.update(organization.id, { name: 'New' })
      expect(updated.name).toBe('New')
    })
  })

  describe('countMembershipsByAccount', () => {
    it('counts distinct organizations the account belongs to', async () => {
      await repo.createWithBranch({ name: 'A', slug: 'a' }, 'acc-1')
      await repo.createWithBranch({ name: 'B', slug: 'b' }, 'acc-1')
      expect(await repo.countMembershipsByAccount('acc-1')).toBe(2)
    })

    it('returns 0 when account has no memberships', async () => {
      expect(await repo.countMembershipsByAccount('nobody')).toBe(0)
    })
  })

  describe('addMember', () => {
    it('adds a new member to the main branch of the org', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const member = await repo.addMember(
        organization.id,
        'acc-2',
        Role.TECHNICIAN
      )
      expect(member.accountId).toBe('acc-2')
      expect(member.role).toBe(Role.TECHNICIAN)
    })
  })

  describe('listMembers', () => {
    it('returns members with account info for the given org', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      repo.seedAccounts([makeAccount('acc-1')])
      const members = await repo.listMembers(organization.id)
      expect(members).toHaveLength(1)
      expect(members[0].account.id).toBe('acc-1')
    })
  })
})
