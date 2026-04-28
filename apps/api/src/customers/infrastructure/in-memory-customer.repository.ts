import { randomUUID } from 'crypto'

import { ResourceStatus } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type {
  CustomerRepositoryInterface,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerQuery,
  CustomerPage,
} from '@customers/interfaces'

export class InMemoryCustomerRepository implements CustomerRepositoryInterface {
  private customers = new Map<string, Prisma.CustomerModel>()

  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel> {
    const now = new Date()
    const customer: Prisma.CustomerModel = {
      id: randomUUID(),
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      taxId: data.taxId ?? null,
      fiscalRegime: data.fiscalRegime ?? null,
      zipCode: data.zipCode ?? null,
      source: data.source ?? null,
      note: data.note ?? null,
      status: ResourceStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    }
    this.customers.set(customer.id, customer)
    return Promise.resolve(customer)
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    const customer = this.customers.get(id)
    if (
      !customer ||
      customer.organizationId !== organizationId ||
      customer.status !== ResourceStatus.ACTIVE
    )
      return Promise.resolve(null)
    return Promise.resolve(customer)
  }

  findAll(organizationId: string, query: CustomerQuery): Promise<CustomerPage> {
    let list = [...this.customers.values()].filter(
      c =>
        c.organizationId === organizationId &&
        c.status === ResourceStatus.ACTIVE
    )

    if (query.search) {
      const term = query.search.toLowerCase()
      list = list.filter(c => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
        return (
          fullName.includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term)
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

  findByEmail(
    email: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    for (const customer of this.customers.values()) {
      if (
        customer.organizationId === organizationId &&
        customer.email === email &&
        customer.status === ResourceStatus.ACTIVE
      ) {
        return Promise.resolve(customer)
      }
    }
    return Promise.resolve(null)
  }

  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    for (const customer of this.customers.values()) {
      if (
        customer.organizationId === organizationId &&
        customer.phone === phone &&
        customer.status === ResourceStatus.ACTIVE
      ) {
        return Promise.resolve(customer)
      }
    }
    return Promise.resolve(null)
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    const customer = this.customers.get(id)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('customer not found'))
    }
    const updated: Prisma.CustomerModel = {
      ...customer,
      ...data,
      updatedAt: new Date(),
    }
    this.customers.set(id, updated)
    return Promise.resolve(updated)
  }

  softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    const customer = this.customers.get(id)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('customer not found'))
    }
    const updated: Prisma.CustomerModel = {
      ...customer,
      status: ResourceStatus.DELETED,
      updatedAt: new Date(),
    }
    this.customers.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, organizationId: string): Promise<void> {
    const customer = this.customers.get(id)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('customer not found'))
    }
    this.customers.delete(id)
    return Promise.resolve()
  }
}
