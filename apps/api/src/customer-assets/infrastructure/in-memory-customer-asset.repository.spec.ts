import { AssetType, ResourceStatus } from '@glossops/database'

import { InMemoryCustomerAssetRepository } from './in-memory-customer-asset.repository'

const ORG = 'org-1'
const OTHER_ORG = 'org-2'
const CUSTOMER_ID = 'cust-1'
const BRAND_ID = 'brand-1'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  assetType: AssetType.VEHICLE,
  model: 'Civic',
  ...overrides,
})

describe('InMemoryCustomerAssetRepository', () => {
  let repo: InMemoryCustomerAssetRepository

  beforeEach(() => {
    repo = new InMemoryCustomerAssetRepository()
    repo.seedCustomers([
      { id: CUSTOMER_ID, organizationId: ORG, status: ResourceStatus.ACTIVE },
    ])
    repo.seedBrands([
      { id: BRAND_ID, organizationId: ORG },
      { id: 'brand-system', organizationId: null },
      { id: 'brand-other', organizationId: OTHER_ORG },
    ])
  })

  describe('create', () => {
    it('creates and returns an asset', async () => {
      const asset = await repo.create(CUSTOMER_ID, makeData())
      expect(asset.customerId).toBe(CUSTOMER_ID)
      expect(asset.assetType).toBe(AssetType.VEHICLE)
      expect(asset.status).toBe(ResourceStatus.ACTIVE)
    })

    it('sets nullable fields to null when not provided', async () => {
      const asset = await repo.create(CUSTOMER_ID, makeData())
      expect(asset.brandId).toBeNull()
      expect(asset.country).toBeNull()
      expect(asset.deletedAt).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns asset when id and organizationId match', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      const found = await repo.findById(created.id, ORG)
      expect(found?.id).toBe(created.id)
    })

    it('returns null when organizationId does not match', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      const found = await repo.findById(created.id, OTHER_ORG)
      expect(found).toBeNull()
    })

    it('returns null for DELETED assets', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await repo.softDelete(created.id, ORG)
      const found = await repo.findById(created.id, ORG)
      expect(found).toBeNull()
    })
  })

  describe('findAllByCustomer', () => {
    const query = { status: ResourceStatus.ACTIVE as const, page: 1, limit: 20 }

    it('returns assets for the customer', async () => {
      await repo.create(CUSTOMER_ID, makeData())
      await repo.create(CUSTOMER_ID, makeData({ model: 'Camry' }))
      const page = await repo.findAllByCustomer(CUSTOMER_ID, ORG, query)
      expect(page.data).toHaveLength(2)
    })

    it('returns empty when customer belongs to another org', async () => {
      await repo.create(CUSTOMER_ID, makeData())
      const page = await repo.findAllByCustomer(CUSTOMER_ID, OTHER_ORG, query)
      expect(page.data).toHaveLength(0)
    })

    it('filters DELETED assets when status=ACTIVE', async () => {
      const a = await repo.create(CUSTOMER_ID, makeData())
      await repo.create(CUSTOMER_ID, makeData({ model: 'Camry' }))
      await repo.softDelete(a.id, ORG)
      const page = await repo.findAllByCustomer(CUSTOMER_ID, ORG, query)
      expect(page.data).toHaveLength(1)
    })

    it('returns DELETED assets when status=DELETED', async () => {
      const a = await repo.create(CUSTOMER_ID, makeData())
      await repo.softDelete(a.id, ORG)
      const page = await repo.findAllByCustomer(CUSTOMER_ID, ORG, {
        ...query,
        status: ResourceStatus.DELETED,
      })
      expect(page.data).toHaveLength(1)
    })

    it('returns all assets when status=ALL', async () => {
      const a = await repo.create(CUSTOMER_ID, makeData())
      await repo.create(CUSTOMER_ID, makeData({ model: 'Camry' }))
      await repo.softDelete(a.id, ORG)
      const page = await repo.findAllByCustomer(CUSTOMER_ID, ORG, {
        ...query,
        status: 'ALL',
      })
      expect(page.data).toHaveLength(2)
    })

    it('filters by assetType', async () => {
      await repo.create(CUSTOMER_ID, makeData({ assetType: AssetType.BOAT }))
      await repo.create(CUSTOMER_ID, makeData({ assetType: AssetType.TRUCK }))
      const page = await repo.findAllByCustomer(CUSTOMER_ID, ORG, {
        ...query,
        assetType: AssetType.BOAT,
      })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].assetType).toBe(AssetType.BOAT)
    })
  })

  describe('findByIdentifier', () => {
    it('returns asset when (country, identifier, org) match', async () => {
      await repo.create(
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      const found = await repo.findByIdentifier('MX', 'ABC-123', ORG)
      expect(found).not.toBeNull()
    })

    it('returns null for a different country', async () => {
      await repo.create(
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      const found = await repo.findByIdentifier('US', 'ABC-123', ORG)
      expect(found).toBeNull()
    })

    it('returns null when identifier belongs to a different org', async () => {
      await repo.create(
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      const found = await repo.findByIdentifier('MX', 'ABC-123', OTHER_ORG)
      expect(found).toBeNull()
    })

    it('returns null for DELETED assets', async () => {
      const a = await repo.create(
        CUSTOMER_ID,
        makeData({ country: 'MX', identifier: 'ABC-123' })
      )
      await repo.softDelete(a.id, ORG)
      const found = await repo.findByIdentifier('MX', 'ABC-123', ORG)
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('updates and returns the asset', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      const updated = await repo.update(created.id, ORG, { model: 'Camry' })
      expect(updated.model).toBe('Camry')
    })

    it('rejects when asset belongs to another org', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await expect(
        repo.update(created.id, OTHER_ORG, { model: 'X' })
      ).rejects.toThrow()
    })
  })

  describe('softDelete', () => {
    it('marks asset as DELETED', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      const deleted = await repo.softDelete(created.id, ORG)
      expect(deleted.status).toBe(ResourceStatus.DELETED)
      expect(deleted.deletedAt).not.toBeNull()
    })

    it('rejects when asset belongs to another org', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await expect(repo.softDelete(created.id, OTHER_ORG)).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('removes the asset permanently', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await repo.delete(created.id, ORG)
      const found = await repo.findById(created.id, ORG)
      expect(found).toBeNull()
    })

    it('rejects when asset belongs to another org', async () => {
      const created = await repo.create(CUSTOMER_ID, makeData())
      await expect(repo.delete(created.id, OTHER_ORG)).rejects.toThrow()
    })
  })

  describe('customerExistsInOrg', () => {
    it('returns true when customer is ACTIVE in org', async () => {
      const result = await repo.customerExistsInOrg(CUSTOMER_ID, ORG)
      expect(result).toBe(true)
    })

    it('returns false when customer belongs to another org', async () => {
      const result = await repo.customerExistsInOrg(CUSTOMER_ID, OTHER_ORG)
      expect(result).toBe(false)
    })

    it('returns false when customer does not exist', async () => {
      const result = await repo.customerExistsInOrg('unknown', ORG)
      expect(result).toBe(false)
    })

    it('returns false when customer is DELETED', async () => {
      repo.seedCustomers([
        {
          id: 'cust-deleted',
          organizationId: ORG,
          status: ResourceStatus.DELETED,
        },
      ])
      const result = await repo.customerExistsInOrg('cust-deleted', ORG)
      expect(result).toBe(false)
    })
  })

  describe('findBrandForOrg', () => {
    it('returns brand when it belongs to the same org', async () => {
      const brand = await repo.findBrandForOrg(BRAND_ID, ORG)
      expect(brand).not.toBeNull()
    })

    it('returns system-seeded brand (organizationId null)', async () => {
      const brand = await repo.findBrandForOrg('brand-system', ORG)
      expect(brand).not.toBeNull()
    })

    it('returns null when brand belongs to a different org', async () => {
      const brand = await repo.findBrandForOrg('brand-other', ORG)
      expect(brand).toBeNull()
    })

    it('returns null for unknown brandId', async () => {
      const brand = await repo.findBrandForOrg('unknown', ORG)
      expect(brand).toBeNull()
    })
  })
})
