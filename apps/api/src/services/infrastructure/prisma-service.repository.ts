import { ConflictException, Injectable } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  ServiceRepositoryInterface,
  CreateServiceData,
  UpdateServiceData,
  ServiceQuery,
  ServicePage,
} from '@services/interfaces'

@Injectable()
export class PrismaServiceRepository implements ServiceRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    data: CreateServiceData
  ): Promise<Prisma.ServiceModel> {
    try {
      return await this.prisma.service.create({
        data: { organizationId, ...data },
      })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({ error: 'name_already_exists' })
      }
      throw e
    }
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel | null> {
    return this.prisma.service.findFirst({ where: { id, organizationId } })
  }

  async findAll(
    organizationId: string,
    query: ServiceQuery
  ): Promise<ServicePage> {
    const where: Prisma.ServiceWhereInput = { organizationId }

    if (!query.includeInactive) {
      where.isActive = true
    }

    if (query.search) {
      const term = query.search
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: 'asc' },
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

  async update(
    id: string,
    organizationId: string,
    data: UpdateServiceData
  ): Promise<Prisma.ServiceModel> {
    try {
      await this.prisma.service.updateMany({
        where: { id, organizationId },
        data,
      })
      return (await this.prisma.service.findFirst({
        where: { id, organizationId },
      }))!
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({ error: 'name_already_exists' })
      }
      throw e
    }
  }

  async activate(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel> {
    await this.prisma.service.updateMany({
      where: { id, organizationId },
      data: { isActive: true },
    })
    return (await this.prisma.service.findFirst({
      where: { id, organizationId },
    }))!
  }

  async deactivate(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel> {
    await this.prisma.service.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    })
    return (await this.prisma.service.findFirst({
      where: { id, organizationId },
    }))!
  }

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.service.deleteMany({ where: { id, organizationId } })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException({ error: 'service_has_references' })
      }
      throw e
    }
  }
}
