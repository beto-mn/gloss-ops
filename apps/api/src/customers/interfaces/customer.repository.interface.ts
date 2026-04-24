import type { Prisma } from '@glossops/database'

export interface CreateCustomerData {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  fiscalRegime?: string
  zipCode?: string
  source?: string
  note?: string
}

export interface UpdateCustomerData {
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  taxId?: string | null
  fiscalRegime?: string | null
  zipCode?: string | null
  source?: string | null
  note?: string | null
}

export interface CustomerQuery {
  search?: string
  page: number
  limit: number
}

export interface CustomerPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CustomerPage {
  data: Prisma.CustomerModel[]
  meta: CustomerPageMeta
}

export interface CustomerRepositoryInterface {
  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  findAll(organizationId: string, query: CustomerQuery): Promise<CustomerPage>
  findByEmail(
    email: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel>
  delete(id: string, organizationId: string): Promise<void>
}
