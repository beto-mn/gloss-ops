import type { AssetType, Prisma } from '@glossops/database'

export interface CreateBrandData {
  name: string
  slug: string
  category: AssetType
  logoUrl?: string
}

export interface UpdateBrandData {
  name?: string
  slug?: string
  category?: AssetType
  logoUrl?: string | null
}

export interface BrandQuery {
  search?: string
  category?: AssetType
  page: number
  limit: number
}

export interface BrandPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface BrandPage {
  data: Prisma.BrandModel[]
  meta: BrandPageMeta
}

export interface BrandRepositoryInterface {
  create(
    organizationId: string,
    data: CreateBrandData
  ): Promise<Prisma.BrandModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null>

  findAll(organizationId: string, query: BrandQuery): Promise<BrandPage>

  update(
    id: string,
    organizationId: string,
    data: UpdateBrandData
  ): Promise<Prisma.BrandModel>

  delete(id: string, organizationId: string): Promise<void>
}
