import { randomUUID } from 'crypto'

import { Prisma } from '@glossops/database'

import type {
  WorkOrderItemRepositoryInterface,
  CreateWorkOrderItemData,
  UpdateWorkOrderItemData,
} from '@work-orders/interfaces'

export class InMemoryWorkOrderItemRepository implements WorkOrderItemRepositoryInterface {
  private store = new Map<string, Prisma.WorkOrderItemModel>()

  create(data: CreateWorkOrderItemData): Promise<Prisma.WorkOrderItemModel> {
    const unitPrice = new Prisma.Decimal(data.unitPrice)
    const discount = new Prisma.Decimal(data.discount)
    const subtotal = unitPrice.times(data.quantity).minus(discount)

    const item: Prisma.WorkOrderItemModel = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      serviceId: data.serviceId,
      description: data.description ?? null,
      quantity: data.quantity,
      unitPrice,
      discount,
      subtotal,
      isBillable: data.isBillable,
      createdAt: new Date(),
    }
    this.store.set(item.id, item)
    return Promise.resolve(item)
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel | null> {
    const item = this.store.get(id)
    if (!item || item.workOrderId !== workOrderId) return Promise.resolve(null)
    return Promise.resolve(item)
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel[]> {
    const items = Array.from(this.store.values()).filter(
      i => i.workOrderId === workOrderId
    )
    return Promise.resolve(items)
  }

  update(
    id: string,
    _workOrderId: string,
    data: UpdateWorkOrderItemData
  ): Promise<Prisma.WorkOrderItemModel> {
    const existing = this.store.get(id)!
    const quantity = data.quantity ?? existing.quantity
    const unitPrice =
      data.unitPrice !== undefined
        ? new Prisma.Decimal(data.unitPrice)
        : existing.unitPrice
    const discount =
      data.discount !== undefined
        ? new Prisma.Decimal(data.discount)
        : existing.discount
    const subtotal = unitPrice.times(quantity).minus(discount)

    const updated: Prisma.WorkOrderItemModel = {
      ...existing,
      ...(data.serviceId !== undefined && { serviceId: data.serviceId }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isBillable !== undefined && { isBillable: data.isBillable }),
      quantity,
      unitPrice,
      discount,
      subtotal,
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _workOrderId: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }
}
