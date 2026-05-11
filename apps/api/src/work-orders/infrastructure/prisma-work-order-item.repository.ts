import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  WorkOrderItemRepositoryInterface,
  CreateWorkOrderItemData,
  UpdateWorkOrderItemData,
} from '@work-orders/interfaces'

@Injectable()
export class PrismaWorkOrderItemRepository implements WorkOrderItemRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWorkOrderItemData): Promise<Prisma.WorkOrderItemModel> {
    const subtotal = data.unitPrice * data.quantity - data.discount
    return this.prisma.workOrderItem.create({
      data: {
        workOrderId: data.workOrderId,
        serviceId: data.serviceId,
        description: data.description,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discount: data.discount,
        subtotal,
        isBillable: data.isBillable,
      },
    })
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel | null> {
    return this.prisma.workOrderItem.findFirst({ where: { id, workOrderId } })
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel[]> {
    return this.prisma.workOrderItem.findMany({ where: { workOrderId } })
  }

  update(
    id: string,
    workOrderId: string,
    data: UpdateWorkOrderItemData
  ): Promise<Prisma.WorkOrderItemModel> {
    return this.prisma.$transaction(async tx => {
      const existing = await tx.workOrderItem.findFirst({
        where: { id, workOrderId },
      })
      const quantity = data.quantity ?? existing!.quantity
      const unitPrice =
        data.unitPrice !== undefined
          ? data.unitPrice
          : Number(existing!.unitPrice)
      const discount =
        data.discount !== undefined ? data.discount : Number(existing!.discount)
      const subtotal = unitPrice * quantity - discount

      return tx.workOrderItem.update({
        where: { id },
        data: {
          ...(data.serviceId !== undefined && { serviceId: data.serviceId }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.isBillable !== undefined && { isBillable: data.isBillable }),
          quantity,
          unitPrice,
          discount,
          subtotal,
        },
      })
    })
  }

  async delete(id: string, _workOrderId: string): Promise<void> {
    await this.prisma.workOrderItem.delete({ where: { id } })
  }
}
