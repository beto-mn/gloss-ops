import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  CustomerRepositoryInterface,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerQuery,
  CustomerPage,
} from '@customers/interfaces'

@Injectable()
export class PrismaCustomerRepository implements CustomerRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel> {
    return this.prisma.customer.create({ data: { organizationId, ...data } })
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({ where: { id, organizationId } })
  }

  async findAll(
    organizationId: string,
    query: CustomerQuery
  ): Promise<CustomerPage> {
    const where: Prisma.CustomerWhereInput = { organizationId }

    if (query.search) {
      const term = query.search
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    }
  }

  findByEmail(
    email: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({ where: { email, organizationId } })
  }

  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({ where: { phone, organizationId } })
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    await this.prisma.customer.updateMany({
      where: { id, organizationId },
      data,
    })
    const record = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    })
    return record!
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.prisma.customer.deleteMany({ where: { id, organizationId } })
  }
}
