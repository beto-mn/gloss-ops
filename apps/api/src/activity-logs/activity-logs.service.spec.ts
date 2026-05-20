import { Test } from '@nestjs/testing'

import { ActivityAction } from '@glossops/database'

import { InMemoryActivityLogRepository } from './infrastructure/in-memory-activity-log.repository'
import { ActivityLogsService } from './activity-logs.service'
import { ACTIVITY_LOG_REPOSITORY } from './activity-logs.tokens'

const ORG = 'org-1'
const BRANCH = 'branch-1'
const ACCOUNT = 'acc-1'

describe('ActivityLogsService', () => {
  let service: ActivityLogsService
  let repo: InMemoryActivityLogRepository

  beforeEach(async () => {
    repo = new InMemoryActivityLogRepository()
    const module = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        { provide: ACTIVITY_LOG_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(ActivityLogsService)
  })

  describe('record', () => {
    it('creates a log entry and resolves void', async () => {
      await expect(
        service.record({
          organizationId: ORG,
          branchId: BRANCH,
          accountId: ACCOUNT,
          action: ActivityAction.CREATED,
          entity: 'WorkOrder',
          entityId: 'wo-1',
        })
      ).resolves.toBeUndefined()
      expect(repo.store.size).toBe(1)
    })

    it('persists all fields including metadata', async () => {
      await service.record({
        organizationId: ORG,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'WorkOrder',
        entityId: 'wo-1',
        metadata: { from: 'DRAFT', to: 'CONFIRMED' },
      })
      const [entry] = Array.from(repo.store.values())
      expect(entry.action).toBe(ActivityAction.STATUS_CHANGED)
      expect(entry.metadata).toEqual({ from: 'DRAFT', to: 'CONFIRMED' })
    })
  })

  describe('findAll', () => {
    beforeEach(async () => {
      await service.record({
        organizationId: ORG,
        action: ActivityAction.CREATED,
        entity: 'WorkOrder',
        entityId: 'wo-1',
      })
      await service.record({
        organizationId: ORG,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'WorkOrder',
        entityId: 'wo-1',
        metadata: { from: 'DRAFT', to: 'CONFIRMED' },
      })
      await service.record({
        organizationId: ORG,
        action: ActivityAction.DELETED,
        entity: 'Customer',
        entityId: 'cust-1',
      })
    })

    it('returns all logs for org with default pagination', async () => {
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(3)
      expect(page.total).toBe(3)
      expect(page.page).toBe(1)
      expect(page.limit).toBe(20)
    })

    it('does not return logs from other orgs', async () => {
      await service.record({
        organizationId: 'org-other',
        action: ActivityAction.CREATED,
        entity: 'WorkOrder',
        entityId: 'wo-x',
      })
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(3)
    })

    it('filters by entity', async () => {
      const page = await service.findAll(ORG, { entity: 'Customer' })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].entity).toBe('Customer')
    })

    it('filters by entityId', async () => {
      const page = await service.findAll(ORG, { entityId: 'wo-1' })
      expect(page.data).toHaveLength(2)
      expect(page.data.every(r => r.entityId === 'wo-1')).toBe(true)
    })

    it('filters by action', async () => {
      const page = await service.findAll(ORG, {
        action: ActivityAction.STATUS_CHANGED,
      })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].action).toBe(ActivityAction.STATUS_CHANGED)
    })

    it('paginates results', async () => {
      const page = await service.findAll(ORG, { page: 1, limit: 2 })
      expect(page.data).toHaveLength(2)
      expect(page.total).toBe(3)
      expect(page.page).toBe(1)
      expect(page.limit).toBe(2)

      const page2 = await service.findAll(ORG, { page: 2, limit: 2 })
      expect(page2.data).toHaveLength(1)
    })
  })
})
