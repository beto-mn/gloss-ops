import type { Prisma } from '@glossops/database'

export interface CreateServiceData {
  name: string
  description?: string
  basePrice?: number
  claveProdServ?: string
  claveUnidad?: string
  warrantyDays?: number
  warrantyDescription?: string
  warrantyTerm?: string
}

export interface UpdateServiceData {
  name?: string
  description?: string | null
  basePrice?: number
  claveProdServ?: string | null
  claveUnidad?: string | null
  warrantyDays?: number | null
  warrantyDescription?: string | null
  warrantyTerm?: string | null
}

export interface ServiceQuery {
  search?: string
  includeInactive: boolean
  page: number
  limit: number
}

export interface ServicePageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ServicePage {
  data: Prisma.ServiceModel[]
  meta: ServicePageMeta
}

export interface ServiceRepositoryInterface {
  create(
    organizationId: string,
    data: CreateServiceData
  ): Promise<Prisma.ServiceModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel | null>

  findAll(organizationId: string, query: ServiceQuery): Promise<ServicePage>

  update(
    id: string,
    organizationId: string,
    data: UpdateServiceData
  ): Promise<Prisma.ServiceModel>

  activate(id: string, organizationId: string): Promise<Prisma.ServiceModel>
  deactivate(id: string, organizationId: string): Promise<Prisma.ServiceModel>

  delete(id: string, organizationId: string): Promise<void>
}
