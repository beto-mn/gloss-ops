import { Injectable } from '@nestjs/common'

import { ResourceStatus } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  CustomerAssetRepositoryInterface,
  CreateCustomerAssetData,
  UpdateCustomerAssetData,
  CustomerAssetQuery,
  CustomerAssetPage,
} from '@customer-assets/interfaces'

@Injectable()
export class PrismaCustomerAssetRepository implements CustomerAssetRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(
    customerId: string,
    data: CreateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel> {
    return this.prisma.customerAsset.create({
      data: {
        customerId,
        ...data,
      } as Prisma.CustomerAssetUncheckedCreateInput,
    })
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null> {
    return this.prisma.customerAsset.findFirst({
      where: {
        id,
        status: ResourceStatus.ACTIVE,
        customer: { organizationId, status: ResourceStatus.ACTIVE },
      },
    })
  }

  async findAllByCustomer(
    customerId: string,
    organizationId: string,
    query: CustomerAssetQuery
  ): Promise<CustomerAssetPage> {
    const where: Prisma.CustomerAssetWhereInput = {
      customerId,
      customer: { organizationId, status: ResourceStatus.ACTIVE },
    }

    if (query.status !== 'ALL') {
      where.status = query.status
    }

    if (query.assetType) {
      where.assetType = query.assetType
    }

    if (query.search) {
      const term = query.search
      where.OR = [
        { model: { contains: term, mode: 'insensitive' } },
        { identifier: { contains: term, mode: 'insensitive' } },
        { color: { contains: term, mode: 'insensitive' } },
        { note: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      this.prisma.customerAsset.count({ where }),
      this.prisma.customerAsset.findMany({
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

  findByIdentifier(
    country: string,
    identifier: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null> {
    return this.prisma.customerAsset.findFirst({
      where: {
        country,
        identifier,
        status: ResourceStatus.ACTIVE,
        customer: { organizationId },
      },
    })
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel> {
    await this.prisma.customerAsset.updateMany({
      where: { id, customer: { organizationId } },
      data: data as Prisma.CustomerAssetUncheckedUpdateManyInput,
    })
    const record = await this.prisma.customerAsset.findFirst({
      where: { id },
    })
    return record!
  }

  async softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel> {
    await this.prisma.customerAsset.updateMany({
      where: { id, customer: { organizationId } },
      data: { status: ResourceStatus.DELETED, deletedAt: new Date() },
    })
    const record = await this.prisma.customerAsset.findFirst({
      where: { id },
    })
    return record!
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.prisma.customerAsset.deleteMany({
      where: { id, customer: { organizationId } },
    })
    if (result.count === 0) throw new Error('asset not found')
  }

  async customerExistsInOrg(
    customerId: string,
    organizationId: string
  ): Promise<boolean> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId, status: ResourceStatus.ACTIVE },
      select: { id: true },
    })
    return customer !== null
  }

  findBrandForOrg(
    brandId: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null> {
    return this.prisma.brand.findFirst({
      where: {
        id: brandId,
        OR: [{ organizationId: null }, { organizationId }],
      },
    })
  }
}
