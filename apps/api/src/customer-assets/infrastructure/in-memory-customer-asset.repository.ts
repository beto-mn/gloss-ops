import { randomUUID } from 'crypto'

import { ResourceStatus } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type {
  CustomerAssetRepositoryInterface,
  CreateCustomerAssetData,
  UpdateCustomerAssetData,
  CustomerAssetQuery,
  CustomerAssetPage,
} from '@customer-assets/interfaces'

interface SeedCustomer {
  id: string
  organizationId: string
  status: ResourceStatus
}

interface SeedBrand {
  id: string
  organizationId: string | null
}

export class InMemoryCustomerAssetRepository implements CustomerAssetRepositoryInterface {
  private assets = new Map<string, Prisma.CustomerAssetModel>()
  private customers = new Map<string, SeedCustomer>()
  private brands = new Map<string, SeedBrand>()

  seedCustomers(customers: SeedCustomer[]): void {
    for (const c of customers) this.customers.set(c.id, c)
  }

  seedBrands(brands: SeedBrand[]): void {
    for (const b of brands) this.brands.set(b.id, b)
  }

  create(
    customerId: string,
    data: CreateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel> {
    const now = new Date()
    const asset: Prisma.CustomerAssetModel = {
      id: randomUUID(),
      customerId,
      brandId: data.brandId ?? null,
      assetType: data.assetType,
      customAssetType: data.customAssetType ?? null,
      model: data.model ?? null,
      year: data.year ?? null,
      identifier: data.identifier ?? null,
      country: data.country ?? null,
      color: data.color ?? null,
      metadata: data.metadata ?? null,
      note: data.note ?? null,
      status: ResourceStatus.ACTIVE,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.assets.set(asset.id, asset)
    return Promise.resolve(asset)
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null> {
    const asset = this.assets.get(id)
    if (!asset || asset.status !== ResourceStatus.ACTIVE) {
      return Promise.resolve(null)
    }
    const customer = this.customers.get(asset.customerId)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.resolve(null)
    }
    return Promise.resolve(asset)
  }

  findAllByCustomer(
    customerId: string,
    organizationId: string,
    query: CustomerAssetQuery
  ): Promise<CustomerAssetPage> {
    const customer = this.customers.get(customerId)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.resolve({
        data: [],
        meta: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      })
    }

    let list = [...this.assets.values()].filter(
      a => a.customerId === customerId
    )

    if (query.status !== 'ALL') {
      list = list.filter(a => a.status === query.status)
    }

    if (query.assetType) {
      list = list.filter(a => a.assetType === query.assetType)
    }

    if (query.search) {
      const term = query.search.toLowerCase()
      list = list.filter(a => {
        return (
          a.model?.toLowerCase().includes(term) ||
          a.identifier?.toLowerCase().includes(term) ||
          a.color?.toLowerCase().includes(term) ||
          a.note?.toLowerCase().includes(term)
        )
      })
    }

    const total = list.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const offset = (query.page - 1) * query.limit
    const data = list.slice(offset, offset + query.limit)

    return Promise.resolve({
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    })
  }

  findByIdentifier(
    country: string,
    identifier: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null> {
    for (const asset of this.assets.values()) {
      if (
        asset.country === country &&
        asset.identifier === identifier &&
        asset.status === ResourceStatus.ACTIVE
      ) {
        const customer = this.customers.get(asset.customerId)
        if (customer && customer.organizationId === organizationId) {
          return Promise.resolve(asset)
        }
      }
    }
    return Promise.resolve(null)
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel> {
    const asset = this.assets.get(id)
    if (!asset) return Promise.reject(new Error('asset not found'))
    const customer = this.customers.get(asset.customerId)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('asset not found'))
    }
    const updated: Prisma.CustomerAssetModel = {
      ...asset,
      ...data,
      updatedAt: new Date(),
    }
    this.assets.set(id, updated)
    return Promise.resolve(updated)
  }

  softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel> {
    const asset = this.assets.get(id)
    if (!asset) return Promise.reject(new Error('asset not found'))
    const customer = this.customers.get(asset.customerId)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('asset not found'))
    }
    const updated: Prisma.CustomerAssetModel = {
      ...asset,
      status: ResourceStatus.DELETED,
      deletedAt: new Date(),
      updatedAt: new Date(),
    }
    this.assets.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, organizationId: string): Promise<void> {
    const asset = this.assets.get(id)
    if (!asset) return Promise.reject(new Error('asset not found'))
    const customer = this.customers.get(asset.customerId)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('asset not found'))
    }
    this.assets.delete(id)
    return Promise.resolve()
  }

  customerExistsInOrg(
    customerId: string,
    organizationId: string
  ): Promise<boolean> {
    const customer = this.customers.get(customerId)
    const exists =
      !!customer &&
      customer.organizationId === organizationId &&
      customer.status === ResourceStatus.ACTIVE
    return Promise.resolve(exists)
  }

  findBrandForOrg(
    brandId: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null> {
    const brand = this.brands.get(brandId)
    if (
      !brand ||
      (brand.organizationId !== null && brand.organizationId !== organizationId)
    ) {
      return Promise.resolve(null)
    }
    return Promise.resolve(brand as unknown as Prisma.BrandModel)
  }
}
