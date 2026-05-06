import { ConflictException, Injectable } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  BrandRepositoryInterface,
  CreateBrandData,
  UpdateBrandData,
  BrandQuery,
  BrandPage,
} from '@brands/interfaces'

@Injectable()
export class PrismaBrandRepository implements BrandRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    data: CreateBrandData
  ): Promise<Prisma.BrandModel> {
    try {
      return await this.prisma.brand.create({
        data: { organizationId, isSeeded: false, ...data },
      })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({ error: 'slug_already_exists' })
      }
      throw e
    }
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null> {
    return this.prisma.brand.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { isSeeded: true }],
      },
    })
  }

  async findAll(organizationId: string, query: BrandQuery): Promise<BrandPage> {
    const where: Prisma.BrandWhereInput = {
      OR: [{ organizationId }, { isSeeded: true }],
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }

    if (query.category) {
      where.category = query.category
    }

    const [total, data] = await Promise.all([
      this.prisma.brand.count({ where }),
      this.prisma.brand.findMany({
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
    data: UpdateBrandData
  ): Promise<Prisma.BrandModel> {
    try {
      await this.prisma.brand.updateMany({
        where: { id, organizationId },
        data,
      })
      return (await this.prisma.brand.findFirst({
        where: { id, organizationId },
      }))!
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({ error: 'slug_already_exists' })
      }
      throw e
    }
  }

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.brand.deleteMany({ where: { id, organizationId } })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException({ error: 'brand_has_references' })
      }
      throw e
    }
  }
}
