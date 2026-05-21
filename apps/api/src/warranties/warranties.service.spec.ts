import { Test, type TestingModule } from '@nestjs/testing'
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ActivityAction } from '@glossops/database'

import { InMemoryWarrantyRepository } from './infrastructure/in-memory-warranty.repository'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WARRANTY_REPOSITORY } from './warranties.tokens'
import { WarrantyService } from './warranties.service'

const ORG_ID = 'org-1'
const BRANCH_ID = 'branch-1'
const ACCOUNT_ID = 'acc-1'
const WO_ID = 'wo-1'
const ASSET_ID = 'asset-1'
const ITEM_ID = 'item-1'
const SERVICE_ID = 'svc-1'

const makeItemCtx = () => ({
  workOrderId: WO_ID,
  assetId: ASSET_ID,
  branchId: BRANCH_ID,
  organizationId: ORG_ID,
})

describe('WarrantyService', () => {
  let service: WarrantyService
  let repo: InMemoryWarrantyRepository
  let activityLogs: jest.Mocked<Pick<ActivityLogsService, 'record'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        {
          provide: WARRANTY_REPOSITORY,
          useClass: InMemoryWarrantyRepository,
        },
        {
          provide: ActivityLogsService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(WarrantyService)
    repo = module.get(WARRANTY_REPOSITORY)
    activityLogs = module.get(ActivityLogsService)
  })

  afterEach(() => {
    repo.store.clear()
    jest.clearAllMocks()
  })

  // ── generateForWorkOrder ───────────────────────────────────────────────────

  describe('generateForWorkOrder', () => {
    const completedAt = new Date('2026-05-20T10:00:00Z')

    it('creates warranties for items with warrantyDays > 0', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 365,
            warrantyDescription: 'Full wrap warranty',
            warrantyTerm: '12 months',
            name: 'Full Wrap',
          },
        },
      ])
      repo.seedItemContext(ITEM_ID, makeItemCtx())

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      expect(repo.store.size).toBe(1)
      const [w] = Array.from(repo.store.values())
      expect(w.workOrderItemId).toBe(ITEM_ID)
      expect(w.serviceId).toBe(SERVICE_ID)
      expect(w.description).toBe('Full wrap warranty')
      expect(w.term).toBe('12 months')
      expect(w.validFrom).toEqual(completedAt)
      expect(w.validUntil).toEqual(new Date('2027-05-20T10:00:00Z'))
      expect(w.isVoid).toBe(false)
    })

    it('uses service.name as fallback when warrantyDescription is null', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 90,
            warrantyDescription: null,
            warrantyTerm: null,
            name: 'Ceramic Coating',
          },
        },
      ])
      repo.seedItemContext(ITEM_ID, makeItemCtx())

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      const [w] = Array.from(repo.store.values())
      expect(w.description).toBe('Ceramic Coating')
      expect(w.term).toBeNull()
    })

    it('skips items with warrantyDays = null', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: null,
            warrantyDescription: null,
            warrantyTerm: null,
            name: 'Detail',
          },
        },
      ])

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      expect(repo.store.size).toBe(0)
    })

    it('skips items with warrantyDays = 0', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 0,
            warrantyDescription: null,
            warrantyTerm: null,
            name: 'Tint',
          },
        },
      ])

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      expect(repo.store.size).toBe(0)
    })

    it('returns without error when no items qualify', async () => {
      repo.seedItemsForGeneration(WO_ID, [])

      await expect(
        service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)
      ).resolves.toBeUndefined()
    })
  })

  // ── validateClaim ──────────────────────────────────────────────────────────

  describe('validateClaim', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24)

    const seedValidWarranty = (
      overrides: Partial<{
        isVoid: boolean
        validUntil: Date
        assetId: string
      }> = {}
    ) => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      const warrantyId = 'w-1'
      repo.store.set(warrantyId, {
        id: warrantyId,
        workOrderItemId: ITEM_ID,
        serviceId: SERVICE_ID,
        branchId: BRANCH_ID,
        description: 'Warranty',
        term: null,
        validFrom: new Date(),
        validUntil: overrides.validUntil ?? futureDate,
        isVoid: overrides.isVoid ?? false,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const assetId = overrides.assetId ?? ASSET_ID
      if (assetId !== ASSET_ID) {
        repo.seedItemContext(ITEM_ID, { ...makeItemCtx(), assetId })
      }
      return warrantyId
    }

    it('resolves without error for a valid warranty', async () => {
      const warrantyId = seedValidWarranty()
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).resolves.toBeUndefined()
    })

    it('throws 404 warranty_not_found when warranty does not exist', async () => {
      await expect(
        service.validateClaim('nonexistent', ASSET_ID, ORG_ID)
      ).rejects.toBeInstanceOf(NotFoundException)
      await expect(
        service.validateClaim('nonexistent', ASSET_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_not_found' } })
    })

    it('throws 422 warranty_voided when isVoid = true', async () => {
      const warrantyId = seedValidWarranty({ isVoid: true })
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toBeInstanceOf(UnprocessableEntityException)
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_voided' } })
    })

    it('throws 422 warranty_expired when validUntil < now', async () => {
      const warrantyId = seedValidWarranty({ validUntil: pastDate })
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toBeInstanceOf(UnprocessableEntityException)
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_expired' } })
    })

    it('throws 422 warranty_asset_mismatch when assetId differs', async () => {
      const warrantyId = seedValidWarranty()
      await expect(
        service.validateClaim(warrantyId, 'other-asset', ORG_ID)
      ).rejects.toBeInstanceOf(UnprocessableEntityException)
      await expect(
        service.validateClaim(warrantyId, 'other-asset', ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'warranty_asset_mismatch' },
      })
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the warranty record', async () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      const id = 'w-1'
      repo.store.set(id, {
        id,
        workOrderItemId: ITEM_ID,
        serviceId: SERVICE_ID,
        branchId: BRANCH_ID,
        description: 'W',
        term: null,
        validFrom: new Date(),
        validUntil: new Date(),
        isVoid: false,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.findOne(id, ORG_ID)
      expect(result.id).toBe(id)
    })

    it('throws 404 warranty_not_found when not found', async () => {
      await expect(
        service.findOne('nonexistent', ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_not_found' } })
    })
  })

  // ── findByWorkOrder ────────────────────────────────────────────────────────

  describe('findByWorkOrder', () => {
    it('returns warranties for the work order', async () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 30,
            warrantyDescription: 'W',
            warrantyTerm: null,
            name: 'Svc',
          },
        },
      ])
      await service.generateForWorkOrder(WO_ID, ORG_ID, new Date())

      const results = await service.findByWorkOrder(WO_ID, ORG_ID)
      expect(results).toHaveLength(1)
    })
  })

  // ── findByAsset ────────────────────────────────────────────────────────────

  describe('findByAsset', () => {
    it('returns warranties for the asset', async () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 30,
            warrantyDescription: 'W',
            warrantyTerm: null,
            name: 'Svc',
          },
        },
      ])
      await service.generateForWorkOrder(WO_ID, ORG_ID, new Date())

      const results = await service.findByAsset(ASSET_ID, ORG_ID)
      expect(results).toHaveLength(1)
    })
  })

  // ── void ───────────────────────────────────────────────────────────────────

  describe('void', () => {
    const seedWarranty = () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      const id = 'w-1'
      repo.store.set(id, {
        id,
        workOrderItemId: ITEM_ID,
        serviceId: SERVICE_ID,
        branchId: BRANCH_ID,
        description: 'W',
        term: null,
        validFrom: new Date(),
        validUntil: new Date(),
        isVoid: false,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      return id
    }

    it('voids the warranty and returns updated record', async () => {
      const id = seedWarranty()
      activityLogs.record.mockResolvedValue(undefined)

      const result = await service.void(
        id,
        'Customer request',
        ORG_ID,
        ACCOUNT_ID
      )

      expect(result.isVoid).toBe(true)
      expect(result.voidReason).toBe('Customer request')
    })

    it('calls activityLogs.record with UPDATED action', async () => {
      const id = seedWarranty()
      activityLogs.record.mockResolvedValue(undefined)

      await service.void(id, 'Damage', ORG_ID, ACCOUNT_ID)

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: ActivityAction.UPDATED,
        entity: 'Warranty',
        entityId: id,
        metadata: { isVoid: true, reason: 'Damage' },
      })
    })

    it('throws 409 warranty_already_voided when already voided', async () => {
      const id = seedWarranty()
      repo.store.set(id, { ...repo.store.get(id)!, isVoid: true })

      await expect(
        service.void(id, 'reason', ORG_ID, ACCOUNT_ID)
      ).rejects.toMatchObject({
        response: { error: 'warranty_already_voided' },
      })
      expect(activityLogs.record).not.toHaveBeenCalled()
    })

    it('throws 404 warranty_not_found when warranty does not exist', async () => {
      await expect(
        service.void('nonexistent', 'reason', ORG_ID, ACCOUNT_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_not_found' } })
      expect(activityLogs.record).not.toHaveBeenCalled()
    })
  })
})
