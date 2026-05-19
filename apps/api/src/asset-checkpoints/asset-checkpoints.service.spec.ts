import { Test, type TestingModule } from '@nestjs/testing'
import {
  AssetCondition,
  CheckpointType,
  WorkOrderStatus,
} from '@glossops/database'

import { ASSET_CHECKPOINT_REPOSITORY } from './asset-checkpoints.tokens'
import { AssetCheckpointsService } from './asset-checkpoints.service'
import { InMemoryAssetCheckpointRepository } from './infrastructure/in-memory-asset-checkpoint.repository'
import { WorkOrdersService } from '../work-orders/work-orders.service'

const WO_ID = 'wo-1'
const ORG_ID = 'org-1'
const ACCOUNT_ID = 'acc-1'

const activeWo = { id: WO_ID, status: WorkOrderStatus.IN_PROGRESS } as any
const completedWo = { id: WO_ID, status: WorkOrderStatus.COMPLETED } as any
const cancelledWo = { id: WO_ID, status: WorkOrderStatus.CANCELLED } as any

const baseDto = {
  type: CheckpointType.RECEPTION,
  generalCondition: AssetCondition.GOOD,
}

describe('AssetCheckpointsService', () => {
  let service: AssetCheckpointsService
  let repo: InMemoryAssetCheckpointRepository
  let workOrdersService: jest.Mocked<Pick<WorkOrdersService, 'findOne'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetCheckpointsService,
        {
          provide: ASSET_CHECKPOINT_REPOSITORY,
          useClass: InMemoryAssetCheckpointRepository,
        },
        {
          provide: WorkOrdersService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(AssetCheckpointsService)
    repo = module.get(ASSET_CHECKPOINT_REPOSITORY)
    workOrdersService = module.get(WorkOrdersService)
  })

  afterEach(() => {
    repo.store.clear()
    jest.clearAllMocks()
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a RECEPTION checkpoint on an active WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      const result = await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      expect(result.workOrderId).toBe(WO_ID)
      expect(result.type).toBe(CheckpointType.RECEPTION)
      expect(result.recordedById).toBe(ACCOUNT_ID)
      expect(result.generalCondition).toBe(AssetCondition.GOOD)
    })

    it('creates a DELIVERY checkpoint on an active WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      const result = await service.create(
        WO_ID,
        { ...baseDto, type: CheckpointType.DELIVERY },
        ACCOUNT_ID,
        ORG_ID
      )

      expect(result.type).toBe(CheckpointType.DELIVERY)
    })

    it('creates a DELIVERY checkpoint on a COMPLETED WO', async () => {
      workOrdersService.findOne.mockResolvedValue(completedWo)

      const result = await service.create(
        WO_ID,
        { ...baseDto, type: CheckpointType.DELIVERY },
        ACCOUNT_ID,
        ORG_ID
      )

      expect(result.type).toBe(CheckpointType.DELIVERY)
    })

    it('throws 409 work_order_cancelled when WO is CANCELLED', async () => {
      workOrdersService.findOne.mockResolvedValue(cancelledWo)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'work_order_cancelled' },
      })
    })

    it('throws 409 work_order_completed when RECEPTION on COMPLETED WO', async () => {
      workOrdersService.findOne.mockResolvedValue(completedWo)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'work_order_completed' },
      })
    })

    it('throws 409 checkpoint_already_exists when same type already exists', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'checkpoint_already_exists' },
      })
    })
  })

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all checkpoints for the given WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      await service.create(
        WO_ID,
        { ...baseDto, type: CheckpointType.RECEPTION },
        ACCOUNT_ID,
        ORG_ID
      )
      await service.create(
        WO_ID,
        { ...baseDto, type: CheckpointType.DELIVERY },
        ACCOUNT_ID,
        ORG_ID
      )

      const results = await service.findAll(WO_ID, ORG_ID)

      expect(results).toHaveLength(2)
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws 404 checkpoint_not_found when checkpoint does not exist', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      await expect(
        service.findOne(WO_ID, 'nonexistent-id', ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'checkpoint_not_found' },
      })
    })

    it('throws 404 checkpoint_not_found when checkpoint belongs to a different WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      const checkpoint = await service.create(
        WO_ID,
        baseDto,
        ACCOUNT_ID,
        ORG_ID
      )

      await expect(
        service.findOne('other-wo-id', checkpoint.id, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'checkpoint_not_found' },
      })
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates mileage and note', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      const checkpoint = await service.create(
        WO_ID,
        baseDto,
        ACCOUNT_ID,
        ORG_ID
      )

      const updated = await service.update(
        WO_ID,
        checkpoint.id,
        { mileage: 12000, note: 'scratch on door' },
        ORG_ID
      )

      expect(updated.mileage).toBe(12000)
      expect(updated.note).toBe('scratch on door')
    })

    it('throws 404 checkpoint_not_found when checkpoint does not exist', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      await expect(
        service.update(WO_ID, 'nonexistent-id', { mileage: 1000 }, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'checkpoint_not_found' },
      })
    })
  })

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the checkpoint', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      const checkpoint = await service.create(
        WO_ID,
        baseDto,
        ACCOUNT_ID,
        ORG_ID
      )

      await service.remove(WO_ID, checkpoint.id, ORG_ID)

      expect(repo.store.has(checkpoint.id)).toBe(false)
    })

    it('throws 404 checkpoint_not_found when checkpoint does not exist', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      await expect(
        service.remove(WO_ID, 'nonexistent-id', ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'checkpoint_not_found' },
      })
    })
  })
})
