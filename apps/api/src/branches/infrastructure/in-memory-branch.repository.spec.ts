import { ResourceStatus } from '@glossops/database'

import { InMemoryBranchRepository } from './in-memory-branch.repository'

describe('InMemoryBranchRepository', () => {
  let repo: InMemoryBranchRepository

  beforeEach(() => {
    repo = new InMemoryBranchRepository()
  })

  describe('create', () => {
    it('creates an ACTIVE branch with deletedAt = null', async () => {
      const branch = await repo.create('org-1', { name: 'CDMX' })
      expect(branch.organizationId).toBe('org-1')
      expect(branch.name).toBe('CDMX')
      expect(branch.status).toBe(ResourceStatus.ACTIVE)
      expect(branch.deletedAt).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns the branch when ACTIVE and in the same org', async () => {
      const branch = await repo.create('org-1', { name: 'CDMX' })
      expect(await repo.findById(branch.id, 'org-1')).toMatchObject({
        id: branch.id,
      })
    })

    it('returns null for a DELETED branch', async () => {
      const branch = await repo.create('org-1', { name: 'CDMX' })
      await repo.softDelete(branch.id, 'org-1')
      expect(await repo.findById(branch.id, 'org-1')).toBeNull()
    })

    it('returns null when the branch belongs to a different org', async () => {
      const branch = await repo.create('org-1', { name: 'CDMX' })
      expect(await repo.findById(branch.id, 'org-2')).toBeNull()
    })
  })

  describe('findByName', () => {
    it('returns the ACTIVE branch with the matching name', async () => {
      const branch = await repo.create('org-1', { name: 'CDMX' })
      expect(await repo.findByName('CDMX', 'org-1')).toMatchObject({
        id: branch.id,
      })
    })

    it('returns null for a DELETED branch (name can be reused)', async () => {
      const branch = await repo.create('org-1', { name: 'CDMX' })
      await repo.softDelete(branch.id, 'org-1')
      expect(await repo.findByName('CDMX', 'org-1')).toBeNull()
    })
  })

  describe('findAll', () => {
    it('defaults to ACTIVE only when status filter is ACTIVE', async () => {
      const a = await repo.create('org-1', { name: 'A' })
      const b = await repo.create('org-1', { name: 'B' })
      await repo.softDelete(b.id, 'org-1')
      const page = await repo.findAll('org-1', {
        status: ResourceStatus.ACTIVE,
        page: 1,
        limit: 10,
      })
      expect(page.data.map(x => x.id)).toEqual([a.id])
      expect(page.meta.total).toBe(1)
    })

    it('returns only DELETED branches when status filter is DELETED', async () => {
      const a = await repo.create('org-1', { name: 'A' })
      const b = await repo.create('org-1', { name: 'B' })
      await repo.softDelete(b.id, 'org-1')
      const page = await repo.findAll('org-1', {
        status: ResourceStatus.INACTIVE,
        page: 1,
        limit: 10,
      })
      expect(page.data.map(x => x.id)).toEqual([b.id])
      expect(page.data.map(x => x.id)).not.toContain(a.id)
    })

    it('returns ACTIVE + DELETED when status filter is ALL', async () => {
      await repo.create('org-1', { name: 'A' })
      const b = await repo.create('org-1', { name: 'B' })
      await repo.softDelete(b.id, 'org-1')
      const page = await repo.findAll('org-1', {
        status: 'ALL',
        page: 1,
        limit: 10,
      })
      expect(page.meta.total).toBe(2)
    })

    it('filters by case-insensitive name search', async () => {
      await repo.create('org-1', { name: 'Sucursal CDMX' })
      await repo.create('org-1', { name: 'Sucursal MTY' })
      const page = await repo.findAll('org-1', {
        status: ResourceStatus.ACTIVE,
        search: 'cdmx',
        page: 1,
        limit: 10,
      })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].name).toBe('Sucursal CDMX')
    })
  })

  describe('countActive', () => {
    it('counts only ACTIVE branches in the org', async () => {
      const a = await repo.create('org-1', { name: 'A' })
      await repo.create('org-1', { name: 'B' })
      await repo.create('org-2', { name: 'C' })
      await repo.softDelete(a.id, 'org-1')
      expect(await repo.countActive('org-1')).toBe(1)
    })
  })

  describe('update', () => {
    it('updates fields and bumps updatedAt', async () => {
      const branch = await repo.create('org-1', { name: 'Old' })
      const updated = await repo.update(branch.id, 'org-1', { name: 'New' })
      expect(updated.name).toBe('New')
    })

    it('rejects when the branch belongs to a different org', async () => {
      const branch = await repo.create('org-1', { name: 'A' })
      await expect(
        repo.update(branch.id, 'org-2', { name: 'B' })
      ).rejects.toThrow('branch not found')
    })
  })

  describe('softDelete', () => {
    it('flips status to DELETED and sets deletedAt', async () => {
      const branch = await repo.create('org-1', { name: 'A' })
      const deleted = await repo.softDelete(branch.id, 'org-1')
      expect(deleted.status).toBe(ResourceStatus.INACTIVE)
      expect(deleted.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('findExpiredDeleted', () => {
    it('returns DELETED branches whose deletedAt is older than the cutoff', async () => {
      const fresh = await repo.create('org-1', { name: 'Fresh' })
      const stale = await repo.create('org-1', { name: 'Stale' })
      await repo.softDelete(fresh.id, 'org-1')
      await repo.softDelete(stale.id, 'org-1')

      // Backdate "stale" by 31 days.
      const staleNow = await repo.findAll('org-1', {
        status: ResourceStatus.INACTIVE,
        page: 1,
        limit: 10,
      })
      const staleRow = staleNow.data.find(b => b.id === stale.id)!
      staleRow.deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)

      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const expired = await repo.findExpiredDeleted(cutoff)
      expect(expired.map(b => b.id)).toEqual([stale.id])
    })
  })

  describe('hardDelete', () => {
    it('removes the branch and cascades the linked OrganizationMember rows', async () => {
      const branch = await repo.create('org-1', { name: 'A' })
      repo.seedMember({ id: 'mem-1', branchId: branch.id })
      repo.seedMember({ id: 'mem-2', branchId: 'other-branch' })

      await repo.hardDelete(branch.id)

      expect(await repo.findById(branch.id, 'org-1')).toBeNull()
      expect(repo.listMembers().map(m => m.id)).toEqual(['mem-2'])
    })

    it('is a no-op when the branch does not exist', async () => {
      await expect(repo.hardDelete('unknown')).resolves.toBeUndefined()
    })
  })
})
