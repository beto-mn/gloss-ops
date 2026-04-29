import { Test } from '@nestjs/testing'
import {
  UnprocessableEntityException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'

import { ResourceStatus } from '@glossops/database'

import { InMemoryBranchRepository } from './infrastructure/in-memory-branch.repository'
import { BranchesService } from './branches.service'
import { BRANCH_REPOSITORY } from './branches.tokens'

describe('BranchesService', () => {
  let service: BranchesService
  let repo: InMemoryBranchRepository

  beforeEach(async () => {
    repo = new InMemoryBranchRepository()
    const module = await Test.createTestingModule({
      providers: [
        BranchesService,
        { provide: BRANCH_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(BranchesService)
  })

  describe('create', () => {
    it('creates a branch when the name is unique in the org', async () => {
      const branch = await service.create('org-1', { name: 'CDMX' })
      expect(branch.name).toBe('CDMX')
    })

    it('throws ConflictException on duplicate name', async () => {
      await service.create('org-1', { name: 'CDMX' })
      await expect(service.create('org-1', { name: 'CDMX' })).rejects.toThrow(
        ConflictException
      )
    })

    it('allows the same name in a different organization', async () => {
      await service.create('org-1', { name: 'CDMX' })
      await expect(
        service.create('org-2', { name: 'CDMX' })
      ).resolves.toBeDefined()
    })
  })

  describe('findAll', () => {
    it('defaults to ACTIVE when status is not provided', async () => {
      const a = await service.create('org-1', { name: 'A' })
      const b = await service.create('org-1', { name: 'B' })
      await repo.softDelete(b.id, 'org-1')
      const page = await service.findAll('org-1', {})
      expect(page.data.map(x => x.id)).toEqual([a.id])
    })

    it('honors explicit status=DELETED', async () => {
      const a = await service.create('org-1', { name: 'A' })
      await repo.softDelete(a.id, 'org-1')
      const page = await service.findAll('org-1', {
        status: ResourceStatus.DELETED,
      })
      expect(page.data).toHaveLength(1)
    })

    it('honors explicit status=ALL', async () => {
      await service.create('org-1', { name: 'A' })
      const b = await service.create('org-1', { name: 'B' })
      await repo.softDelete(b.id, 'org-1')
      const page = await service.findAll('org-1', { status: 'ALL' })
      expect(page.meta.total).toBe(2)
    })
  })

  describe('findOne', () => {
    it('returns the branch when found', async () => {
      const branch = await service.create('org-1', { name: 'A' })
      expect(await service.findOne(branch.id, 'org-1')).toMatchObject({
        id: branch.id,
      })
    })

    it('throws NotFoundException for an unknown id', async () => {
      await expect(service.findOne('unknown', 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException for a branch in another org', async () => {
      const branch = await service.create('org-1', { name: 'A' })
      await expect(service.findOne(branch.id, 'org-2')).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException for a soft-deleted branch', async () => {
      const branch = await service.create('org-1', { name: 'A' })
      await repo.softDelete(branch.id, 'org-1')
      await expect(service.findOne(branch.id, 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates fields on an existing branch', async () => {
      const branch = await service.create('org-1', { name: 'Old' })
      const updated = await service.update(branch.id, 'org-1', {
        name: 'New',
      })
      expect(updated.name).toBe('New')
    })

    it('throws NotFoundException for an unknown branch', async () => {
      await expect(
        service.update('unknown', 'org-1', { name: 'X' })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when renaming collides with another ACTIVE branch', async () => {
      await service.create('org-1', { name: 'A' })
      const b = await service.create('org-1', { name: 'B' })
      await expect(
        service.update(b.id, 'org-1', { name: 'A' })
      ).rejects.toThrow(ConflictException)
    })

    it('allows renaming a branch to its own current name (no-op)', async () => {
      const branch = await service.create('org-1', { name: 'A' })
      await expect(
        service.update(branch.id, 'org-1', { name: 'A' })
      ).resolves.toMatchObject({ name: 'A' })
    })
  })

  describe('remove', () => {
    it('soft-deletes a branch when more than one ACTIVE exists', async () => {
      await service.create('org-1', { name: 'A' })
      const b = await service.create('org-1', { name: 'B' })
      await service.remove(b.id, 'org-1')
      expect(await repo.findById(b.id, 'org-1')).toBeNull()
    })

    it('throws UnprocessableEntityException when it is the last ACTIVE branch', async () => {
      const branch = await service.create('org-1', { name: 'Only' })
      await expect(service.remove(branch.id, 'org-1')).rejects.toThrow(
        UnprocessableEntityException
      )
    })

    it('throws NotFoundException for an unknown branch', async () => {
      await expect(service.remove('unknown', 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
