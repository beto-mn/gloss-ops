import { Test } from '@nestjs/testing'

import { ResourceStatus } from '@glossops/database'

import { InMemoryBranchRepository } from './infrastructure/in-memory-branch.repository'
import { BranchCleanupService } from './branches.cleanup.service'
import { BRANCH_REPOSITORY } from './branches.tokens'

describe('BranchCleanupService', () => {
  let service: BranchCleanupService
  let repo: InMemoryBranchRepository

  beforeEach(async () => {
    repo = new InMemoryBranchRepository()
    const module = await Test.createTestingModule({
      providers: [
        BranchCleanupService,
        { provide: BRANCH_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(BranchCleanupService)
  })

  it('hard-deletes only the branches whose deletedAt is older than 30 days', async () => {
    const fresh = await repo.create('org-1', { name: 'Fresh' })
    const stale = await repo.create('org-1', { name: 'Stale' })
    await repo.softDelete(fresh.id, 'org-1')
    await repo.softDelete(stale.id, 'org-1')

    // Backdate "stale" by 31 days.
    const all = await repo.findAll('org-1', {
      status: ResourceStatus.DELETED,
      page: 1,
      limit: 10,
    })
    const staleRow = all.data.find(b => b.id === stale.id)!
    staleRow.deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)

    await service.cleanup()

    // Stale is gone; fresh remains (still DELETED but inside the 30-day window).
    const after = await repo.findAll('org-1', {
      status: 'ALL',
      page: 1,
      limit: 10,
    })
    expect(after.data.map(b => b.id)).toEqual([fresh.id])
  })

  it('cascades the linked OrganizationMember rows on hard delete', async () => {
    const branch = await repo.create('org-1', { name: 'A' })
    repo.seedMember({ id: 'mem-1', branchId: branch.id })
    repo.seedMember({ id: 'mem-2', branchId: 'other' })
    await repo.softDelete(branch.id, 'org-1')

    const page = await repo.findAll('org-1', {
      status: ResourceStatus.DELETED,
      page: 1,
      limit: 10,
    })
    page.data[0].deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)

    await service.cleanup()

    expect(repo.listMembers().map(m => m.id)).toEqual(['mem-2'])
  })

  it('is a no-op when no branches are expired', async () => {
    await repo.create('org-1', { name: 'A' })
    await expect(service.cleanup()).resolves.toBeUndefined()
  })
})
