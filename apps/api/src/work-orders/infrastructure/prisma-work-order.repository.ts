import { Injectable } from '@nestjs/common'

import { WorkOrderStatus, type Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  WorkOrderRepositoryInterface,
  CreateWorkOrderData,
  UpdateWorkOrderData,
  WorkOrderQuery,
  WorkOrderPage,
  WorkOrderListItem,
  WorkOrderWithItems,
} from '@work-orders/interfaces'

@Injectable()
export class PrismaWorkOrderRepository implements WorkOrderRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWorkOrderData): Promise<Prisma.WorkOrderModel> {
    return this.prisma.workOrder.create({
      data: {
        branchId: data.branchId,
        assetId: data.assetId,
        type: data.type,
        warrantyClaimId: data.warrantyClaimId,
        scheduledAt: data.scheduledAt,
        note: data.note,
      },
    })
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<WorkOrderWithItems | null> {
    return this.prisma.workOrder.findFirst({
      where: { id, branch: { organizationId } },
      include: {
        items: { include: { service: { select: { id: true, name: true } } } },
        asset: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true } },
            brand: { select: { id: true, name: true } },
          },
        },
      },
    }) as Promise<WorkOrderWithItems | null>
  }

  async findAll(
    organizationId: string,
    query: WorkOrderQuery
  ): Promise<WorkOrderPage> {
    const where = {
      branch: { organizationId },
      ...(query.status && { status: query.status }),
      ...(query.assetId && { assetId: query.assetId }),
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: {
            include: {
              customer: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ])

    const data: WorkOrderListItem[] = rows.map(wo => ({
      ...wo,
      customerId: wo.asset.customer.id,
      customer: wo.asset.customer,
      asset: {
        id: wo.asset.id,
        assetType: wo.asset.assetType,
        customAssetType: wo.asset.customAssetType,
        model: wo.asset.model,
        identifier: wo.asset.identifier,
      },
    }))

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

  update(
    id: string,
    organizationId: string,
    data: UpdateWorkOrderData
  ): Promise<Prisma.WorkOrderModel> {
    return this.prisma.workOrder.update({
      where: { id, branch: { organizationId } },
      data: {
        ...(data.scheduledAt !== undefined && {
          scheduledAt: data.scheduledAt,
        }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.totalAmount !== undefined && {
          totalAmount: data.totalAmount,
        }),
      },
    })
  }

  updateStatus(
    id: string,
    organizationId: string,
    status: WorkOrderStatus,
    completedAt?: Date
  ): Promise<Prisma.WorkOrderModel> {
    return this.prisma.workOrder.update({
      where: { id, branch: { organizationId } },
      data: {
        status,
        ...(completedAt !== undefined && { completedAt }),
      },
    })
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.prisma.workOrder.delete({
      where: { id, branch: { organizationId } },
    })
  }
}
