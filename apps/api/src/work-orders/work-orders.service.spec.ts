import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import {
  ActivityAction,
  WorkOrderStatus,
  WorkOrderType,
} from '@glossops/database'

import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { InventoryService } from '../inventory/inventory.service'

import { InMemoryWorkOrderItemRepository } from './infrastructure/in-memory-work-order-item.repository'
import { InMemoryWorkOrderRepository } from './infrastructure/in-memory-work-order.repository'
import { WorkOrdersService } from './work-orders.service'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'

const ORG = 'org-1'
const BRANCH = 'branch-1'
const ASSET = 'asset-1'
const SERVICE = 'service-1'
const ACCOUNT = 'acc-1'

describe('WorkOrdersService', () => {
  let service: WorkOrdersService
  let woRepo: InMemoryWorkOrderRepository
  let itemRepo: InMemoryWorkOrderItemRepository
  let inventoryService: {
    maybeCreateUsage: jest.Mock
    commitUsages: jest.Mock
    deleteUsagesByWorkOrder: jest.Mock
  }
  let activityLogs: { record: jest.Mock }

  beforeEach(async () => {
    woRepo = new InMemoryWorkOrderRepository()
    itemRepo = new InMemoryWorkOrderItemRepository()
    woRepo.seedBranches([{ id: BRANCH, organizationId: ORG }])
    woRepo.setItemsGetter(id => itemRepo.findAllByWorkOrder(id))

    inventoryService = {
      maybeCreateUsage: jest.fn().mockResolvedValue(undefined),
      commitUsages: jest.fn().mockResolvedValue({ warnings: [] }),
      deleteUsagesByWorkOrder: jest.fn().mockResolvedValue(undefined),
    }

    activityLogs = {
      record: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: WORK_ORDER_REPOSITORY, useValue: woRepo },
        { provide: WORK_ORDER_ITEM_REPOSITORY, useValue: itemRepo },
        { provide: InventoryService, useValue: inventoryService },
        { provide: ActivityLogsService, useValue: activityLogs },
      ],
    }).compile()

    service = module.get(WorkOrdersService)
  })

  describe('create', () => {
    it('creates a DRAFT work order with defaults', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      expect(wo.status).toBe(WorkOrderStatus.DRAFT)
      expect(wo.type).toBe(WorkOrderType.STANDARD)
      expect(wo.branchId).toBe(BRANCH)
      expect(Number(wo.totalAmount)).toBe(0)
    })

    it('uses provided type and scheduledAt', async () => {
      const wo = await service.create(
        BRANCH,
        ORG,
        {
          assetId: ASSET,
          type: WorkOrderType.WARRANTY_CLAIM,
          scheduledAt: '2026-06-01T09:00:00Z',
        },
        ACCOUNT
      )
      expect(wo.type).toBe(WorkOrderType.WARRANTY_CLAIM)
      expect(wo.scheduledAt).not.toBeNull()
    })
  })

  describe('findAll', () => {
    it('returns paginated work orders for the organization', async () => {
      await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(2)
      expect(page.meta.total).toBe(2)
      expect(page.meta.page).toBe(1)
      expect(page.meta.limit).toBe(20)
    })

    it('filters by status', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      const page = await service.findAll(ORG, {
        status: WorkOrderStatus.CONFIRMED,
      })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].status).toBe(WorkOrderStatus.CONFIRMED)
    })

    it('does not return work orders from other orgs', async () => {
      woRepo.seedBranches([{ id: 'branch-other', organizationId: 'org-other' }])
      await service.create(
        'branch-other',
        'org-other',
        { assetId: ASSET },
        ACCOUNT
      )
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(0)
    })
  })

  describe('findOne', () => {
    it('returns the work order with items', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(found.id).toBe(wo.id)
      expect(found.items).toHaveLength(1)
    })

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.findOne('unknown', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException for another org', async () => {
      woRepo.seedBranches([{ id: 'branch-other', organizationId: 'org-other' }])
      const wo = await service.create(
        'branch-other',
        'org-other',
        {
          assetId: ASSET,
        },
        ACCOUNT
      )
      await expect(service.findOne(wo.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates note', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const updated = await service.update(wo.id, ORG, { note: 'VIP customer' })
      expect(updated.note).toBe('VIP customer')
    })

    it('clears scheduledAt when passed null', async () => {
      const wo = await service.create(
        BRANCH,
        ORG,
        {
          assetId: ASSET,
          scheduledAt: '2026-06-01T09:00:00Z',
        },
        ACCOUNT
      )
      const updated = await service.update(wo.id, ORG, { scheduledAt: null })
      expect(updated.scheduledAt).toBeNull()
    })

    it('throws NotFoundException when not found', async () => {
      await expect(
        service.update('unknown', ORG, { note: 'x' })
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('transition', () => {
    it('transitions DRAFT → CONFIRMED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const updated = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.CONFIRMED,
        ACCOUNT
      )
      expect(updated.status).toBe(WorkOrderStatus.CONFIRMED)
    })

    it('transitions CONFIRMED → DRAFT (revert)', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      const reverted = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.DRAFT,
        ACCOUNT
      )
      expect(reverted.status).toBe(WorkOrderStatus.DRAFT)
    })

    it('transitions IN_PROGRESS → COMPLETED and sets completedAt', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)
      const completed = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.COMPLETED,
        ACCOUNT
      )
      expect(completed.status).toBe(WorkOrderStatus.COMPLETED)
      expect(completed.completedAt).not.toBeNull()
    })

    it('throws ConflictException for invalid transition DRAFT → COMPLETED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(
        service.transition(wo.id, ORG, WorkOrderStatus.COMPLETED, ACCOUNT)
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when COMPLETED is terminal', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.COMPLETED)
      await expect(
        service.transition(wo.id, ORG, WorkOrderStatus.CANCELLED, ACCOUNT)
      ).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException when not found', async () => {
      await expect(
        service.transition('unknown', ORG, WorkOrderStatus.CONFIRMED, ACCOUNT)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('removes a DRAFT work order', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(service.remove(wo.id, ORG, ACCOUNT)).resolves.toBeUndefined()
      await expect(service.findOne(wo.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when status is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(service.remove(wo.id, ORG, ACCOUNT)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws NotFoundException when not found', async () => {
      await expect(service.remove('unknown', ORG, ACCOUNT)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('addItem', () => {
    it('adds an item and updates totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 500,
        quantity: 2,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(found.items).toHaveLength(1)
      expect(Number(found.totalAmount)).toBe(1000)
    })

    it('applies discount to subtotal and totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
        discount: 20,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(80)
    })

    it('accumulates totalAmount across multiple items', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 200,
        quantity: 1,
      })
      await service.addItem(wo.id, ORG, {
        serviceId: 'svc-2',
        unitPrice: 300,
        quantity: 2,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(800)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(
        service.addItem(wo.id, ORG, {
          serviceId: SERVICE,
          unitPrice: 100,
          quantity: 1,
        })
      ).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException for unknown work order', async () => {
      await expect(
        service.addItem('unknown', ORG, {
          serviceId: SERVICE,
          unitPrice: 100,
          quantity: 1,
        })
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getItems', () => {
    it('returns all items for the work order', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await service.addItem(wo.id, ORG, {
        serviceId: 'svc-2',
        unitPrice: 200,
        quantity: 1,
      })
      const items = await service.getItems(wo.id, ORG)
      expect(items).toHaveLength(2)
    })

    it('throws NotFoundException for unknown work order', async () => {
      await expect(service.getItems('unknown', ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('updateItem', () => {
    it('updates item quantity and recalculates totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await service.updateItem(wo.id, item.id, ORG, { quantity: 3 })
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(300)
    })

    it('throws NotFoundException for unknown item', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(
        service.updateItem(wo.id, 'unknown-item', ORG, { quantity: 2 })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(
        service.updateItem(wo.id, item.id, ORG, { quantity: 2 })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('removeItem', () => {
    it('removes item and recalculates totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await service.addItem(wo.id, ORG, {
        serviceId: 'svc-2',
        unitPrice: 200,
        quantity: 1,
      })
      await service.removeItem(wo.id, item.id, ORG)
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(200)
    })

    it('throws NotFoundException for unknown item', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(
        service.removeItem(wo.id, 'unknown-item', ORG)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(service.removeItem(wo.id, item.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })
  })

  describe('addItem — inventory integration', () => {
    it('calls inventoryService.maybeCreateUsage with workOrderId and serviceId', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
        discount: 0,
      })
      expect(inventoryService.maybeCreateUsage).toHaveBeenCalledWith(
        wo.id,
        SERVICE
      )
    })
  })

  describe('transition — inventory integration', () => {
    it('calls commitUsages when transitioning to COMPLETED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.CONFIRMED, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.IN_PROGRESS, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.COMPLETED, ACCOUNT)
      expect(inventoryService.commitUsages).toHaveBeenCalledWith(wo.id)
    })

    it('calls deleteUsagesByWorkOrder when transitioning to CANCELLED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.CANCELLED, ACCOUNT)
      expect(inventoryService.deleteUsagesByWorkOrder).toHaveBeenCalledWith(
        wo.id
      )
    })
  })

  describe('create — activity log', () => {
    it('calls activityLogs.record with CREATED action', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG,
        branchId: BRANCH,
        accountId: ACCOUNT,
        action: ActivityAction.CREATED,
        entity: 'WorkOrder',
        entityId: wo.id,
      })
    })
  })

  describe('transition — activity log', () => {
    it('calls activityLogs.record with STATUS_CHANGED and correct metadata', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      activityLogs.record.mockClear()
      await service.transition(wo.id, ORG, WorkOrderStatus.CONFIRMED, ACCOUNT)
      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG,
        branchId: BRANCH,
        accountId: ACCOUNT,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'WorkOrder',
        entityId: wo.id,
        metadata: {
          from: WorkOrderStatus.DRAFT,
          to: WorkOrderStatus.CONFIRMED,
        },
      })
    })
  })

  describe('remove — activity log', () => {
    it('calls activityLogs.record with DELETED action', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      activityLogs.record.mockClear()
      await service.remove(wo.id, ORG, ACCOUNT)
      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG,
        branchId: BRANCH,
        accountId: ACCOUNT,
        action: ActivityAction.DELETED,
        entity: 'WorkOrder',
        entityId: wo.id,
      })
    })
  })
})
