import { randomUUID } from 'crypto'

import { Prisma, PurchaseOrderStatus } from '@glossops/database'

import type {
  PurchaseOrderRepositoryInterface,
  PurchaseOrderWithItems,
  PurchaseOrderItemRecord,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  PurchaseOrderQuery,
  PurchaseOrderPage,
  ReceiveItemUpdate,
} from '@purchase-orders/interfaces'

export class InMemoryPurchaseOrderRepository implements PurchaseOrderRepositoryInterface {
  readonly store = new Map<string, PurchaseOrderWithItems>()

  create(data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems> {
    const id = randomUUID()
    const po: PurchaseOrderWithItems = {
      id,
      branchId: data.branchId,
      supplierId: data.supplierId,
      status: PurchaseOrderStatus.DRAFT,
      expectedAt: data.expectedAt ?? null,
      receivedAt: null,
      note: data.note ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items.map(
        (item): PurchaseOrderItemRecord => ({
          id: randomUUID(),
          purchaseOrderId: id,
          inventoryId: item.inventoryId,
          quantity: new Prisma.Decimal(item.quantity),
          receivedQuantity: new Prisma.Decimal(0),
          unitCost: new Prisma.Decimal(item.unitCost),
          note: item.note ?? null,
          createdAt: new Date(),
        })
      ),
    }
    this.store.set(id, po)
    return Promise.resolve(po)
  }

  findById(
    id: string,
    branchId: string
  ): Promise<PurchaseOrderWithItems | null> {
    const po = this.store.get(id)
    if (!po || po.branchId !== branchId) return Promise.resolve(null)
    return Promise.resolve(po)
  }

  findAll(
    branchId: string,
    query: PurchaseOrderQuery
  ): Promise<PurchaseOrderPage> {
    let data = [...this.store.values()].filter(p => p.branchId === branchId)
    if (query.status) data = data.filter(p => p.status === query.status)
    if (query.supplierId)
      data = data.filter(p => p.supplierId === query.supplierId)
    data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const total = data.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const sliced = data.slice(
      (query.page - 1) * query.limit,
      query.page * query.limit
    )
    return Promise.resolve({
      data: sliced,
      meta: {
        total,
        totalPages,
        page: query.page,
        limit: query.limit,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    })
  }

  update(
    id: string,
    _branchId: string,
    data: UpdatePurchaseOrderData
  ): Promise<PurchaseOrderWithItems> {
    const po = this.store.get(id)!
    const updated: PurchaseOrderWithItems = {
      ...po,
      supplierId: data.supplierId ?? po.supplierId,
      expectedAt:
        data.expectedAt !== undefined ? data.expectedAt : po.expectedAt,
      note: data.note !== undefined ? data.note : po.note,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _branchId: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }

  updateStatusAndItems(
    id: string,
    status: PurchaseOrderStatus,
    receivedAt: Date | null,
    items: ReceiveItemUpdate[]
  ): Promise<PurchaseOrderWithItems> {
    const po = this.store.get(id)!
    const updatedItems = po.items.map(item => {
      const update = items.find(u => u.itemId === item.id)
      return update
        ? { ...item, receivedQuantity: update.newReceivedQuantity }
        : item
    })
    const updated: PurchaseOrderWithItems = {
      ...po,
      status,
      receivedAt,
      updatedAt: new Date(),
      items: updatedItems,
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }
}
