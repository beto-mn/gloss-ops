import { randomUUID } from 'crypto'

import { InventoryType, Prisma } from '@glossops/database'

import type {
  MaterialRollRepositoryInterface,
  InventoryRecord,
  CreateMaterialRollData,
  UpdateMaterialRollData,
} from '@inventory/interfaces'

export class InMemoryMaterialRollRepository implements MaterialRollRepositoryInterface {
  constructor(private readonly store: Map<string, InventoryRecord>) {}

  create(data: CreateMaterialRollData): Promise<InventoryRecord> {
    const id = randomUUID()
    const record: InventoryRecord = {
      id,
      branchId: data.branchId,
      supplierId: data.supplierId ?? null,
      brandId: data.brandId ?? null,
      type: InventoryType.ROLL,
      name: data.name,
      unitCost: new Prisma.Decimal(data.unitCost ?? 0),
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryItem: null,
      materialRoll: {
        id,
        series: data.series,
        finish: data.finish,
        color: data.color,
        width: new Prisma.Decimal(data.width),
        remainingLength: new Prisma.Decimal(data.remainingLength),
        lotNumber: data.lotNumber ?? null,
      },
    }
    this.store.set(id, record)
    return Promise.resolve(record)
  }

  update(
    id: string,
    branchId: string,
    data: UpdateMaterialRollData
  ): Promise<InventoryRecord> {
    const record = this.store.get(id)!
    const roll = record.materialRoll!
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
      materialRoll: {
        ...roll,
        series: data.series ?? roll.series,
        finish: data.finish ?? roll.finish,
        color: data.color ?? roll.color,
        width: data.width != null ? new Prisma.Decimal(data.width) : roll.width,
        remainingLength:
          data.remainingLength != null
            ? new Prisma.Decimal(data.remainingLength)
            : roll.remainingLength,
        lotNumber:
          data.lotNumber !== undefined ? data.lotNumber : roll.lotNumber,
      },
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _branchId: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }

  decrementLength(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.MaterialRollModel> {
    const record = this.store.get(id)!
    const roll = record.materialRoll!
    const newLength = new Prisma.Decimal(
      Number(roll.remainingLength) - Number(quantity)
    )
    const updatedRoll = { ...roll, remainingLength: newLength }
    this.store.set(id, { ...record, materialRoll: updatedRoll })
    return Promise.resolve(updatedRoll)
  }

  incrementLength(
    id: string,
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal
  ): Promise<void> {
    const record = this.store.get(id)!
    const roll = record.materialRoll!
    const newLength = new Prisma.Decimal(
      Number(roll.remainingLength) + Number(quantity)
    )
    this.store.set(id, {
      ...record,
      unitCost,
      materialRoll: { ...roll, remainingLength: newLength },
    })
    return Promise.resolve()
  }
}
