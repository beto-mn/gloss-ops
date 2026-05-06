import type { Prisma } from '@glossops/database'

export interface CreateSupplierData {
  name: string
  contactName?: string
  phone?: string
  email?: string
  note?: string
}

export interface UpdateSupplierData {
  name?: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
}

export interface SupplierQuery {
  search?: string
  page: number
  limit: number
}

export interface SupplierPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface SupplierPage {
  data: Prisma.SupplierModel[]
  meta: SupplierPageMeta
}

export interface SupplierRepositoryInterface {
  create(
    organizationId: string,
    data: CreateSupplierData
  ): Promise<Prisma.SupplierModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.SupplierModel | null>

  findAll(organizationId: string, query: SupplierQuery): Promise<SupplierPage>

  update(
    id: string,
    organizationId: string,
    data: UpdateSupplierData
  ): Promise<Prisma.SupplierModel>

  delete(id: string, organizationId: string): Promise<void>
}
