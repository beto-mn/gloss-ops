import type { AssetType, ResourceStatus, Prisma } from '@glossops/database'

export interface CreateCustomerAssetData {
  assetType: AssetType
  customAssetType?: string
  brandId?: string
  model?: string
  year?: number
  identifier?: string
  country?: string
  color?: string
  metadata?: Prisma.JsonValue
  note?: string
}

export interface UpdateCustomerAssetData {
  assetType?: AssetType
  customAssetType?: string | null
  brandId?: string | null
  model?: string | null
  year?: number | null
  identifier?: string | null
  country?: string | null
  color?: string | null
  metadata?: Prisma.JsonValue | null
  note?: string | null
}

export type CustomerAssetStatusFilter = ResourceStatus | 'ALL'

export interface CustomerAssetQuery {
  status: CustomerAssetStatusFilter
  search?: string
  assetType?: AssetType
  page: number
  limit: number
}

export interface CustomerAssetPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CustomerAssetPage {
  data: Prisma.CustomerAssetModel[]
  meta: CustomerAssetPageMeta
}

export interface CustomerAssetRepositoryInterface {
  create(
    customerId: string,
    data: CreateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null>

  findAllByCustomer(
    customerId: string,
    organizationId: string,
    query: CustomerAssetQuery
  ): Promise<CustomerAssetPage>

  findByIdentifier(
    country: string,
    identifier: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null>

  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel>

  softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel>

  delete(id: string, organizationId: string): Promise<void>

  customerExistsInOrg(
    customerId: string,
    organizationId: string
  ): Promise<boolean>

  findBrandForOrg(
    brandId: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null>
}
