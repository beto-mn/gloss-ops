import { Injectable } from '@nestjs/common'

import { ResourceStatus, WorkOrderStatus } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  CustomerRepositoryInterface,
  CustomerWithCount,
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
    return this.prisma.customer.findFirst({
      where: { id, organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  async findAll(
    organizationId: string,
    query: CustomerQuery
  ): Promise<CustomerPage> {
    const statusFilter = query.status ?? 'ACTIVE'
    const where: Prisma.CustomerWhereInput = { organizationId }
    if (statusFilter !== 'ALL') {
      where.status = statusFilter
    }

    if (query.search) {
      const term = query.search
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ]
    }

    const sortBy = query.sortBy ?? 'createdAt'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    }

    const activeStatuses = [
      WorkOrderStatus.DRAFT,
      WorkOrderStatus.CONFIRMED,
      WorkOrderStatus.IN_PROGRESS,
    ]

    const [total, rows] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
        include: {
          assets: {
            select: {
              _count: {
                select: {
                  workOrders: { where: { status: { in: activeStatuses } } },
                },
              },
            },
          },
        },
      }),
    ])

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)

    const data: CustomerWithCount[] = rows.map(({ assets, ...customer }) => ({
      ...customer,
      activeWorkOrderCount: assets.reduce(
        (sum, a) => sum + a._count.workOrders,
        0
      ),
    }))

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
    return this.prisma.customer.findFirst({
      where: { email, organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({
      where: { phone, organizationId, status: ResourceStatus.ACTIVE },
    })
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

  async softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    const result = await this.prisma.customer.updateMany({
      where: { id, organizationId },
      data: { status: ResourceStatus.INACTIVE },
    })
    if (result.count === 0) throw new Error('customer not found')
    const record = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    })
    return record!
  }

  async restore(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    const result = await this.prisma.customer.updateMany({
      where: { id, organizationId, status: ResourceStatus.INACTIVE },
      data: { status: ResourceStatus.ACTIVE },
    })
    if (result.count === 0) throw new Error('customer not found')
    const record = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    })
    return record!
  }
}
