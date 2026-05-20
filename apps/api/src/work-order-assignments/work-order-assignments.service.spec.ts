import { Test, type TestingModule } from '@nestjs/testing'
import { AssignmentRole, WorkOrderStatus } from '@glossops/database'

import type { WorkOrderWithItems } from '@work-orders/interfaces'

import { WORK_ORDER_ASSIGNMENT_REPOSITORY } from './work-order-assignments.tokens'
import { WorkOrderAssignmentsService } from './work-order-assignments.service'
import { InMemoryWorkOrderAssignmentRepository } from './infrastructure/in-memory-work-order-assignment.repository'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WorkOrdersService } from '../work-orders/work-orders.service'

const WO_ID = 'wo-1'
const ORG_ID = 'org-1'
const BRANCH_ID = 'branch-1'
const ACCOUNT_ID = 'acc-1'
const MEMBER_ID = 'member-1'

const activeWo = {
  id: WO_ID,
  status: WorkOrderStatus.IN_PROGRESS,
  branchId: BRANCH_ID,
} as unknown as WorkOrderWithItems
const completedWo = {
  id: WO_ID,
  status: WorkOrderStatus.COMPLETED,
  branchId: BRANCH_ID,
} as unknown as WorkOrderWithItems
const cancelledWo = {
  id: WO_ID,
  status: WorkOrderStatus.CANCELLED,
  branchId: BRANCH_ID,
} as unknown as WorkOrderWithItems

const baseDto = { memberId: MEMBER_ID }

describe('WorkOrderAssignmentsService', () => {
  let service: WorkOrderAssignmentsService
  let repo: InMemoryWorkOrderAssignmentRepository
  let workOrdersService: jest.Mocked<Pick<WorkOrdersService, 'findOne'>>
  let activityLogs: jest.Mocked<Pick<ActivityLogsService, 'record'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderAssignmentsService,
        {
          provide: WORK_ORDER_ASSIGNMENT_REPOSITORY,
          useClass: InMemoryWorkOrderAssignmentRepository,
        },
        {
          provide: WorkOrdersService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ActivityLogsService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(WorkOrderAssignmentsService)
    repo = module.get(WORK_ORDER_ASSIGNMENT_REPOSITORY)
    workOrdersService = module.get(WorkOrdersService)
    activityLogs = module.get(ActivityLogsService)
  })

  afterEach(() => {
    repo.store.clear()
    jest.clearAllMocks()
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      repo.seedMember(MEMBER_ID, ORG_ID)
    })

    it('assigns with default ASSISTANT role', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      const result = await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      expect(result.workOrderId).toBe(WO_ID)
      expect(result.memberId).toBe(MEMBER_ID)
      expect(result.role).toBe(AssignmentRole.ASSISTANT)
    })

    it('assigns with explicit LEAD role', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      const result = await service.create(
        WO_ID,
        { ...baseDto, role: AssignmentRole.LEAD },
        ACCOUNT_ID,
        ORG_ID
      )

      expect(result.role).toBe(AssignmentRole.LEAD)
    })

    it('throws 404 work_order_not_found if WO does not exist', async () => {
      workOrdersService.findOne.mockRejectedValue({
        response: { error: 'work_order_not_found' },
      })

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'work_order_not_found' } })
    })

    it('throws 409 work_order_not_assignable if WO is COMPLETED', async () => {
      workOrdersService.findOne.mockResolvedValue(completedWo)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'work_order_not_assignable' },
      })
    })

    it('throws 409 work_order_not_assignable if WO is CANCELLED', async () => {
      workOrdersService.findOne.mockResolvedValue(cancelledWo)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'work_order_not_assignable' },
      })
    })

    it('throws 404 member_not_found if member is not in org', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      await expect(
        service.create(
          WO_ID,
          { memberId: 'unknown-member' },
          ACCOUNT_ID,
          ORG_ID
        )
      ).rejects.toMatchObject({ response: { error: 'member_not_found' } })
    })

    it('throws 409 assignment_already_exists on duplicate', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'assignment_already_exists' },
      })
    })

    it('calls activityLogs.record with ASSIGNED action and correct metadata', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      activityLogs.record.mockResolvedValue(undefined)

      await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: 'ASSIGNED',
        entity: 'WorkOrder',
        entityId: WO_ID,
        metadata: { memberId: MEMBER_ID, role: AssignmentRole.ASSISTANT },
      })
    })
  })

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns assignments for the WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      repo.seedMember(MEMBER_ID, ORG_ID)
      await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      const results = await service.findAll(WO_ID, ORG_ID)

      expect(results).toHaveLength(1)
      expect(results[0].workOrderId).toBe(WO_ID)
    })
  })

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes the assignment', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      repo.seedMember(MEMBER_ID, ORG_ID)
      const assignment = await service.create(
        WO_ID,
        baseDto,
        ACCOUNT_ID,
        ORG_ID
      )

      await service.remove(WO_ID, assignment.id, ORG_ID)

      expect(repo.store.has(assignment.id)).toBe(false)
    })

    it('throws 404 assignment_not_found when assignment does not exist', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      await expect(
        service.remove(WO_ID, 'nonexistent-id', ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'assignment_not_found' } })
    })

    it('throws 404 assignment_not_found when assignment belongs to another WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      repo.seedMember(MEMBER_ID, ORG_ID)
      const assignment = await service.create(
        WO_ID,
        baseDto,
        ACCOUNT_ID,
        ORG_ID
      )

      await expect(
        service.remove('other-wo', assignment.id, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'assignment_not_found' } })
    })
  })
})
