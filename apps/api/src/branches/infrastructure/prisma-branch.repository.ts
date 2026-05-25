import { Injectable } from '@nestjs/common'

import { ResourceStatus } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  BranchRepositoryInterface,
  CreateBranchData,
  UpdateBranchData,
  BranchQuery,
  BranchPage,
} from '@branches/interfaces'

@Injectable()
export class PrismaBranchRepository implements BranchRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(
    organizationId: string,
    data: CreateBranchData
  ): Promise<Prisma.BranchModel> {
    return this.prisma.branch.create({ data: { organizationId, ...data } })
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null> {
    return this.prisma.branch.findFirst({
      where: { id, organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  findByName(
    name: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null> {
    return this.prisma.branch.findFirst({
      where: { name, organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  async findAll(
    organizationId: string,
    query: BranchQuery
  ): Promise<BranchPage> {
    const where: Prisma.BranchWhereInput = { organizationId }

    if (query.status !== 'ALL') {
      where.status = query.status
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }

    const [total, data] = await Promise.all([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
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

  countActive(organizationId: string): Promise<number> {
    return this.prisma.branch.count({
      where: { organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateBranchData
  ): Promise<Prisma.BranchModel> {
    await this.prisma.branch.updateMany({
      where: { id, organizationId },
      data,
    })
    const record = await this.prisma.branch.findFirst({
      where: { id, organizationId },
    })
    return record!
  }

  async softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.BranchModel> {
    const result = await this.prisma.branch.updateMany({
      where: { id, organizationId },
      data: { status: ResourceStatus.INACTIVE, deletedAt: new Date() },
    })
    if (result.count === 0) throw new Error('branch not found')
    const record = await this.prisma.branch.findFirst({
      where: { id, organizationId },
    })
    return record!
  }

  findExpiredDeleted(olderThan: Date): Promise<Prisma.BranchModel[]> {
    return this.prisma.branch.findMany({
      where: { status: ResourceStatus.INACTIVE, deletedAt: { lt: olderThan } },
    })
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.branch.deleteMany({ where: { id } })
  }
}
