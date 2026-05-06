import { ConflictException, Injectable } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  SupplierRepositoryInterface,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierQuery,
  SupplierPage,
} from '@suppliers/interfaces'

@Injectable()
export class PrismaSupplierRepository implements SupplierRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    data: CreateSupplierData
  ): Promise<Prisma.SupplierModel> {
    try {
      return await this.prisma.supplier.create({
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
  ): Promise<Prisma.SupplierModel | null> {
    return this.prisma.supplier.findFirst({ where: { id, organizationId } })
  }

  async findAll(
    organizationId: string,
    query: SupplierQuery
  ): Promise<SupplierPage> {
    const where: Prisma.SupplierWhereInput = { organizationId }

    if (query.search) {
      const term = query.search
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { contactName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
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
    data: UpdateSupplierData
  ): Promise<Prisma.SupplierModel> {
    try {
      await this.prisma.supplier.updateMany({
        where: { id, organizationId },
        data,
      })
      return (await this.prisma.supplier.findFirst({
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

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.supplier.deleteMany({ where: { id, organizationId } })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException({ error: 'supplier_has_references' })
      }
      throw e
    }
  }
}
