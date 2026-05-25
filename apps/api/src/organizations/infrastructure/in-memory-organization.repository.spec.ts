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
    it('creates org, a branch named after the org, and an OWNER member for the given account', async () => {
      const { organization, member } = await repo.createWithBranch(
        { name: 'Taller', slug: 'taller' },
        'acc-1'
      )
      expect(organization.name).toBe('Taller')
      expect(organization.slug).toBe('taller')
      expect(member.accountId).toBe('acc-1')
      expect(member.role).toBe(Role.OWNER)
      expect(member.branchId).toBeTruthy()
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

    it('returns null for a DELETED organization', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await repo.softDelete(organization.id)
      expect(await repo.findById(organization.id)).toBeNull()
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

    it('excludes INACTIVE organizations', async () => {
      const { organization: active } = await repo.createWithBranch(
        { name: 'Active', slug: 'active' },
        'acc-1'
      )
      const { organization: deleted } = await repo.createWithBranch(
        { name: 'Deleted', slug: 'deleted' },
        'acc-1'
      )
      await repo.softDelete(deleted.id)
      const orgs = await repo.findAllByAccountId('acc-1')
      expect(orgs.map(o => o.id)).toContain(active.id)
      expect(orgs.map(o => o.id)).not.toContain(deleted.id)
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
    it('adds a new member anchored to the given branchId', async () => {
      const { member: ownerMember } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const member = await repo.addMember(
        ownerMember.branchId,
        'acc-2',
        Role.TECHNICIAN
      )
      expect(member.accountId).toBe('acc-2')
      expect(member.role).toBe(Role.TECHNICIAN)
      expect(member.branchId).toBe(ownerMember.branchId)
    })

    it('rejects when the branchId does not exist', async () => {
      await expect(
        repo.addMember('non-existent-branch', 'acc-2', Role.TECHNICIAN)
      ).rejects.toThrow('branch not found')
    })
  })

  describe('findBranchById', () => {
    it('returns branch when (branchId, organizationId) match', async () => {
      const { organization, member } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const branch = await repo.findBranchById(member.branchId, organization.id)
      expect(branch?.id).toBe(member.branchId)
    })

    it('returns null when branchId belongs to a different organization', async () => {
      const { member } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const { organization: otherOrg } = await repo.createWithBranch(
        { name: 'Other', slug: 'other' },
        'acc-2'
      )
      expect(await repo.findBranchById(member.branchId, otherOrg.id)).toBeNull()
    })

    it('returns null when branchId does not exist', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      expect(await repo.findBranchById('unknown', organization.id)).toBeNull()
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

  describe('softDelete', () => {
    it('marks the organization as INACTIVE and hides it from findById', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await repo.softDelete(organization.id)
      expect(await repo.findById(organization.id)).toBeNull()
    })

    it('rejects when organization does not exist', async () => {
      await expect(repo.softDelete('unknown')).rejects.toThrow(
        'organization not found'
      )
    })
  })

  describe('delete', () => {
    it('removes an ACTIVE organization from the store', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await repo.delete(organization.id)
      // Verify it's gone by attempting a second delete which should reject
      await expect(repo.delete(organization.id)).rejects.toThrow(
        'organization not found'
      )
    })

    it('removes an INACTIVE organization from the store (hard delete any status)', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await repo.softDelete(organization.id)
      await repo.delete(organization.id)
      await expect(repo.delete(organization.id)).rejects.toThrow(
        'organization not found'
      )
    })

    it('rejects when organization does not exist', async () => {
      await expect(repo.delete('unknown')).rejects.toThrow(
        'organization not found'
      )
    })
  })
})
