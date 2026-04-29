import type { ResourceStatus } from '@glossops/database'
import type { Prisma } from '@glossops/database'

export interface CreateBranchData {
  name: string
  address?: string
  phone?: string
  email?: string
}

export interface UpdateBranchData {
  name?: string
  address?: string | null
  phone?: string | null
  email?: string | null
}

export type BranchStatusFilter = ResourceStatus | 'ALL'

export interface BranchQuery {
  status: BranchStatusFilter
  search?: string
  page: number
  limit: number
}

export interface BranchPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface BranchPage {
  data: Prisma.BranchModel[]
  meta: BranchPageMeta
}

export interface BranchRepositoryInterface {
  create(
    organizationId: string,
    data: CreateBranchData
  ): Promise<Prisma.BranchModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null>
  findByName(
    name: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null>
  findAll(organizationId: string, query: BranchQuery): Promise<BranchPage>
  countActive(organizationId: string): Promise<number>
  update(
    id: string,
    organizationId: string,
    data: UpdateBranchData
  ): Promise<Prisma.BranchModel>
  softDelete(id: string, organizationId: string): Promise<Prisma.BranchModel>
  findExpiredDeleted(olderThan: Date): Promise<Prisma.BranchModel[]>
  hardDelete(id: string): Promise<void>
}
