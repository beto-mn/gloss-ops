import {
  UnprocessableEntityException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AssetType, ResourceStatus } from '@glossops/database'

import { InMemoryCustomerAssetRepository } from './infrastructure/in-memory-customer-asset.repository'
import { CustomerAssetsService } from './customer-assets.service'
import { CUSTOMER_ASSET_REPOSITORY } from './customer-assets.tokens'

const ORG = 'org-1'
const OTHER_ORG = 'org-2'
const CUSTOMER_ID = 'cust-1'
const BRAND_ID = 'brand-1'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  assetType: AssetType.VEHICLE,
  brandId: BRAND_ID,
  model: 'Civic',
  identifier: 'ABC-123',
  ...overrides,
})

describe('CustomerAssetsService', () => {
  let service: CustomerAssetsService
  let repo: InMemoryCustomerAssetRepository

  beforeEach(async () => {
    repo = new InMemoryCustomerAssetRepository()
    repo.seedCustomers([
      { id: CUSTOMER_ID, organizationId: ORG, status: ResourceStatus.ACTIVE },
    ])
    repo.seedBrands([
      { id: BRAND_ID, organizationId: ORG },
      { id: 'brand-system', organizationId: null },
      { id: 'brand-other', organizationId: OTHER_ORG },
    ])
    const module = await Test.createTestingModule({
      providers: [
        CustomerAssetsService,
        { provide: CUSTOMER_ASSET_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(CustomerAssetsService)
  })

  describe('create', () => {
    it('creates and returns the asset', async () => {
      const asset = await service.create(ORG, CUSTOMER_ID, makeData())
      expect(asset.customerId).toBe(CUSTOMER_ID)
      expect(asset.assetType).toBe(AssetType.VEHICLE)
    })

    it('throws NotFoundException when customer is not in org', async () => {
      await expect(
        service.create(OTHER_ORG, CUSTOMER_ID, makeData())
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when customer does not exist', async () => {
      await expect(service.create(ORG, 'unknown', makeData())).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws UnprocessableEntityException when assetType=OTHER without customAssetType', async () => {
      await expect(
        service.create(
          ORG,
          CUSTOMER_ID,
          makeData({ assetType: AssetType.OTHER })
        )
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws UnprocessableEntityException when customAssetType provided for non-OTHER assetType', async () => {
      await expect(
        service.create(
          ORG,
          CUSTOMER_ID,
          makeData({ assetType: AssetType.VEHICLE, customAssetType: 'Drone' })
        )
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('creates with assetType=OTHER and customAssetType', async () => {
      const asset = await service.create(
        ORG,
        CUSTOMER_ID,
        makeData({ assetType: AssetType.OTHER, customAssetType: 'Drone' })
      )
      expect(asset.assetType).toBe(AssetType.OTHER)
      expect(asset.customAssetType).toBe('Drone')
    })

    it('throws NotFoundException when brandId belongs to another org', async () => {
      await expect(
        service.create(ORG, CUSTOMER_ID, makeData({ brandId: 'brand-other' }))
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException for unknown brandId', async () => {
      await expect(
        service.create(ORG, CUSTOMER_ID, makeData({ brandId: 'unknown' }))
      ).rejects.toThrow(NotFoundException)
    })

    it('accepts system-seeded brand', async () => {
      const asset = await service.create(
        ORG,
        CUSTOMER_ID,
        makeData({ brandId: 'brand-system' })
      )
      expect(asset.brandId).toBe('brand-system')
    })

    it('throws ConflictException when (country, identifier) already exists in org', async () => {
      await service.create(
        ORG,
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      await expect(
        service.create(
          ORG,
          CUSTOMER_ID,
          makeData({ country: 'MX', identifier: 'ABC-123' })
        )
      ).rejects.toThrow(ConflictException)
    })

    it('allows same identifier with different country', async () => {
      await service.create(
        ORG,
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      await expect(
        service.create(
          ORG,
          CUSTOMER_ID,
          makeData({ country: 'US', identifier: 'ABC-123' })
        )
      ).resolves.toBeDefined()
    })
  })

  describe('findAllByCustomer', () => {
    it('throws NotFoundException when customer is not in org', async () => {
      await expect(
        service.findAllByCustomer(OTHER_ORG, CUSTOMER_ID, {})
      ).rejects.toThrow(NotFoundException)
    })

    it('returns ACTIVE assets by default', async () => {
      await repo.create(CUSTOMER_ID, makeData())
      const result = await service.findAllByCustomer(ORG, CUSTOMER_ID, {})
      expect(result.data).toHaveLength(1)
    })

    it('applies defaults page=1, limit=20', async () => {
      const result = await service.findAllByCustomer(ORG, CUSTOMER_ID, {})
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('returns INACTIVE assets when status=INACTIVE', async () => {
      const a = await repo.create(CUSTOMER_ID, makeData())
      await repo.softDelete(a.id, ORG)
      const result = await service.findAllByCustomer(ORG, CUSTOMER_ID, {
        status: 'INACTIVE',
      })
      expect(result.data).toHaveLength(1)
    })

    it('returns all assets when status=ALL', async () => {
      const a = await repo.create(CUSTOMER_ID, makeData())
      await repo.create(CUSTOMER_ID, makeData({ model: 'Camry' }))
      await repo.softDelete(a.id, ORG)
      const result = await service.findAllByCustomer(ORG, CUSTOMER_ID, {
        status: 'ALL',
      })
      expect(result.data).toHaveLength(2)
    })
  })

  describe('findOne', () => {
    it('returns asset when it belongs to the org', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      const found = await service.findOne(created.id, ORG)
      expect(found.id).toBe(created.id)
    })

    it('throws NotFoundException when asset does not exist', async () => {
      await expect(service.findOne('unknown', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException for asset in another org', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await expect(service.findOne(created.id, OTHER_ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException for INACTIVE asset', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await repo.softDelete(created.id, ORG)
      await expect(service.findOne(created.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates and returns the asset', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      const updated = await service.update(created.id, ORG, { model: 'Camry' })
      expect(updated.model).toBe('Camry')
    })

    it('throws NotFoundException when asset does not exist', async () => {
      await expect(
        service.update('unknown', ORG, { model: 'X' })
      ).rejects.toThrow(NotFoundException)
    })

    it('rejects switching to OTHER without customAssetType against merged state', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await expect(
        service.update(created.id, ORG, { assetType: AssetType.OTHER })
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('rejects supplying customAssetType for non-OTHER type against merged state', async () => {
      const created = await repo.create(
        CUSTOMER_ID,
        makeData({ assetType: AssetType.OTHER, customAssetType: 'Drone' })
      )
      await expect(
        service.update(created.id, ORG, {
          assetType: AssetType.VEHICLE,
          customAssetType: 'Drone',
        })
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws NotFoundException when updated brandId is foreign', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await expect(
        service.update(created.id, ORG, { brandId: 'brand-other' })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException on duplicate (country, identifier) for a different asset', async () => {
      await repo.create(
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      const target = await repo.create(CUSTOMER_ID, makeData())
      await expect(
        service.update(target.id, ORG, {
          country: 'MX',
          identifier: 'ABC-123',
        })
      ).rejects.toThrow(ConflictException)
    })

    it('does NOT throw when updating (country, identifier) to same value', async () => {
      const created = await repo.create(
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      await expect(
        service.update(created.id, ORG, {
          country: 'MX',
          identifier: 'ABC-123',
        })
      ).resolves.toBeDefined()
    })
  })

  describe('remove', () => {
    it('soft-deletes an ACTIVE asset', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await service.remove(created.id, ORG, false)
      await expect(service.findOne(created.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when soft-deleting an already-INACTIVE asset', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await repo.softDelete(created.id, ORG)
      await expect(service.remove(created.id, ORG, false)).rejects.toThrow(
        NotFoundException
      )
    })

    it('permanently deletes an asset', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await service.remove(created.id, ORG, true)
      await expect(service.remove(created.id, ORG, true)).rejects.toThrow(
        NotFoundException
      )
    })

    it('permanently deletes an INACTIVE asset (Owner cleaning up)', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await repo.softDelete(created.id, ORG)
      await expect(
        service.remove(created.id, ORG, true)
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundException when permanently deleting from another org', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await expect(service.remove(created.id, OTHER_ORG, true)).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
