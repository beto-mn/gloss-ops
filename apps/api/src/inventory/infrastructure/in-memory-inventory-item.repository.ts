import { randomUUID } from 'crypto'

import { InventoryType, Prisma } from '@glossops/database'

import type {
  InventoryItemRepositoryInterface,
  InventoryRecord,
  CreateInventoryItemData,
  UpdateInventoryItemData,
} from '@inventory/interfaces'

export class InMemoryInventoryItemRepository implements InventoryItemRepositoryInterface {
  constructor(private readonly store: Map<string, InventoryRecord>) {}

  create(data: CreateInventoryItemData): Promise<InventoryRecord> {
    const id = randomUUID()
    const record: InventoryRecord = {
      id,
      branchId: data.branchId,
      supplierId: data.supplierId ?? null,
      brandId: data.brandId ?? null,
      type: InventoryType.ITEM,
      name: data.name,
      unitCost: new Prisma.Decimal(data.unitCost ?? 0),
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryItem: {
        id,
        sku: data.sku ?? null,
        description: data.description ?? null,
        stock: new Prisma.Decimal(data.stock ?? 0),
        unit: data.unit,
        lowStockAlert:
          data.lowStockAlert != null
            ? new Prisma.Decimal(data.lowStockAlert)
            : null,
      },
      materialRoll: null,
    }
    this.store.set(id, record)
    return Promise.resolve(record)
  }

  update(
    id: string,
    branchId: string,
    data: UpdateInventoryItemData
  ): Promise<InventoryRecord> {
    const record = this.store.get(id)!
    const item = record.inventoryItem!
    const updated: InventoryRecord = {
      ...record,
      branchId,
      supplierId:
        data.supplierId !== undefined ? data.supplierId : record.supplierId,
      brandId: data.brandId !== undefined ? data.brandId : record.brandId,
      name: data.name ?? record.name,
      unitCost:
        data.unitCost != null
          ? new Prisma.Decimal(data.unitCost)
          : record.unitCost,
      updatedAt: new Date(),
      inventoryItem: {
        ...item,
        sku: data.sku !== undefined ? data.sku : item.sku,
        description:
          data.description !== undefined ? data.description : item.description,
        stock: data.stock != null ? new Prisma.Decimal(data.stock) : item.stock,
        unit: data.unit ?? item.unit,
        lowStockAlert:
          data.lowStockAlert !== undefined
            ? data.lowStockAlert != null
              ? new Prisma.Decimal(data.lowStockAlert)
              : null
            : item.lowStockAlert,
      },
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _branchId: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }

  decrementStock(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.InventoryItemModel> {
    const record = this.store.get(id)!
    const item = record.inventoryItem!
    const newStock = new Prisma.Decimal(Number(item.stock) - Number(quantity))
    const updatedItem = { ...item, stock: newStock }
    this.store.set(id, { ...record, inventoryItem: updatedItem })
    return Promise.resolve(updatedItem)
  }

  incrementStock(
    id: string,
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal
  ): Promise<void> {
    const record = this.store.get(id)!
    const item = record.inventoryItem!
    const newStock = new Prisma.Decimal(Number(item.stock) + Number(quantity))
    this.store.set(id, {
      ...record,
      unitCost,
      inventoryItem: { ...item, stock: newStock },
    })
    return Promise.resolve()
  }
}
