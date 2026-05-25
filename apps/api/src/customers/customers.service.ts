import {
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  CustomerRepositoryInterface,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerPage,
} from '@customers/interfaces'

import { CUSTOMER_REPOSITORY } from './customers.tokens'
import { ListCustomersDto } from './dto'

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepositoryInterface
  ) {}

  async create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel> {
    if (data.email) {
      const existing = await this.customers.findByEmail(
        data.email,
        organizationId
      )
      if (existing)
        throw new ConflictException({ error: 'email_already_exists' })
    }
    if (data.phone) {
      const existing = await this.customers.findByPhone(
        data.phone,
        organizationId
      )
      if (existing)
        throw new ConflictException({ error: 'phone_already_exists' })
    }
    return this.customers.create(organizationId, data)
  }

  findAll(
    organizationId: string,
    dto: ListCustomersDto
  ): Promise<CustomerPage> {
    return this.customers.findAll(organizationId, {
      search: dto.search,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
      status: dto.status ?? 'ACTIVE',
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    const customer = await this.customers.findById(id, organizationId)
    if (!customer) throw new NotFoundException({ error: 'customer_not_found' })
    return customer
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    await this.findOne(id, organizationId)

    if (data.email) {
      const existing = await this.customers.findByEmail(
        data.email,
        organizationId
      )
      if (existing && existing.id !== id) {
        throw new ConflictException({ error: 'email_already_exists' })
      }
    }
    if (data.phone) {
      const existing = await this.customers.findByPhone(
        data.phone,
        organizationId
      )
      if (existing && existing.id !== id) {
        throw new ConflictException({ error: 'phone_already_exists' })
      }
    }

    return this.customers.update(id, organizationId, data)
  }

  async restore(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    try {
      return await this.customers.restore(id, organizationId)
    } catch {
      throw new NotFoundException({ error: 'customer_not_found' })
    }
  }

  async remove(
    id: string,
    organizationId: string,
    permanent = false
  ): Promise<void> {
    if (permanent) {
      try {
        await this.customers.delete(id, organizationId)
      } catch {
        throw new NotFoundException({ error: 'customer_not_found' })
      }
    } else {
      await this.findOne(id, organizationId)
      await this.customers.softDelete(id, organizationId)
    }
  }
}
