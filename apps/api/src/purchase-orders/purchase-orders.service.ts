import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common'

import { Prisma, PurchaseOrderStatus } from '@glossops/database'

import type {
  PurchaseOrderRepositoryInterface,
  PurchaseOrderItemRepositoryInterface,
  PurchaseOrderWithItems,
  PurchaseOrderPage,
  ReceiveItemUpdate,
} from '@purchase-orders/interfaces'
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ListPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
} from './dto'
import {
  PURCHASE_ORDER_ITEM_REPOSITORY,
  PURCHASE_ORDER_REPOSITORY,
} from './purchase-orders.tokens'
import { InventoryService } from '../inventory/inventory.service'

const RECEIVABLE_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]
const CANCELLABLE_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY)
    private readonly orders: PurchaseOrderRepositoryInterface,
    @Inject(PURCHASE_ORDER_ITEM_REPOSITORY)
    private readonly orderItems: PurchaseOrderItemRepositoryInterface,
    private readonly inventoryService: InventoryService
  ) {}

  create(
    branchId: string,
    dto: CreatePurchaseOrderDto
  ): Promise<PurchaseOrderWithItems> {
    return this.orders.create({
      branchId,
      supplierId: dto.supplierId,
      expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
      note: dto.note,
      items: dto.items.map(i => ({
        inventoryId: i.inventoryId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        note: i.note,
      })),
    })
  }

  async findOne(id: string, branchId: string): Promise<PurchaseOrderWithItems> {
    const po = await this.orders.findById(id, branchId)
    if (!po) throw new NotFoundException({ error: 'purchase_order_not_found' })
    return po
  }

  findAll(
    branchId: string,
    dto: ListPurchaseOrdersDto
  ): Promise<PurchaseOrderPage> {
    return this.orders.findAll(branchId, {
      status: dto.status,
      supplierId: dto.supplierId,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async update(
    id: string,
    branchId: string,
    dto: UpdatePurchaseOrderDto
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(id, branchId)
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'purchase_order_not_editable' })
    }
    return this.orders.update(id, branchId, {
      supplierId: dto.supplierId,
      expectedAt:
        dto.expectedAt !== undefined
          ? dto.expectedAt
            ? new Date(dto.expectedAt)
            : null
          : undefined,
      note: dto.note,
    })
  }

  async remove(id: string, branchId: string): Promise<void> {
    const po = await this.findOne(id, branchId)
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'purchase_order_not_editable' })
    }
    return this.orders.delete(id, branchId)
  }

  async receive(
    id: string,
    branchId: string,
    dto: ReceivePurchaseOrderDto
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(id, branchId)
    if (!RECEIVABLE_STATUSES.includes(po.status)) {
      throw new ConflictException({ error: 'purchase_order_not_receivable' })
    }

    const poItemIds = new Set(po.items.map(i => i.id))
    for (const item of dto.items) {
      if (!poItemIds.has(item.itemId)) {
        throw new BadRequestException({
          error: 'purchase_order_item_not_found',
        })
      }
    }

    const updates: ReceiveItemUpdate[] = dto.items.map(d => {
      const existing = po.items.find(i => i.id === d.itemId)!
      return {
        itemId: d.itemId,
        newReceivedQuantity: new Prisma.Decimal(
          Number(existing.receivedQuantity) + d.receivedQuantity
        ),
      }
    })

    const updatedItems = po.items.map(item => {
      const u = updates.find(u => u.itemId === item.id)
      return u ? { ...item, receivedQuantity: u.newReceivedQuantity } : item
    })

    const allReceived = updatedItems.every(
      i => Number(i.receivedQuantity) >= Number(i.quantity)
    )
    const newStatus = allReceived
      ? PurchaseOrderStatus.RECEIVED
      : PurchaseOrderStatus.PARTIALLY_RECEIVED
    const receivedAt = allReceived ? new Date() : null

    const result = await this.orders.updateStatusAndItems(
      id,
      newStatus,
      receivedAt,
      updates
    )

    for (const d of dto.items) {
      const poItem = po.items.find(i => i.id === d.itemId)!
      await this.inventoryService.applyReceive(
        poItem.inventoryId,
        d.receivedQuantity,
        Number(poItem.unitCost)
      )
    }

    return result
  }

  async cancel(id: string, branchId: string): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(id, branchId)
    if (!CANCELLABLE_STATUSES.includes(po.status)) {
      throw new ConflictException({ error: 'purchase_order_not_cancellable' })
    }
    return this.orders.updateStatusAndItems(
      id,
      PurchaseOrderStatus.CANCELLED,
      po.receivedAt,
      []
    )
  }
}
