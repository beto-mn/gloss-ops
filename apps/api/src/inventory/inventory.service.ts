// apps/api/src/inventory/inventory.service.ts
import {
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'

import { InventoryType, Prisma } from '@glossops/database'

import type {
  ServiceDefaultsRepositoryInterface,
  InventoryUsageRepositoryInterface,
  InventoryItemRepositoryInterface,
  MaterialRollRepositoryInterface,
  InventoryRepositoryInterface,
  CommitUsagesResult,
  InventoryRecord,
  InventoryPage,
} from '@inventory/interfaces'
import type {
  CreateInventoryItemDto,
  CreateMaterialRollDto,
  ListInventoryDto,
  UpdateInventoryItemDto,
  UpdateMaterialRollDto,
} from './dto'
import {
  INVENTORY_ITEM_REPOSITORY,
  INVENTORY_REPOSITORY,
  INVENTORY_USAGE_REPOSITORY,
  MATERIAL_ROLL_REPOSITORY,
  SERVICE_DEFAULTS_REPOSITORY,
} from './inventory.tokens'

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventory: InventoryRepositoryInterface,
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItems: InventoryItemRepositoryInterface,
    @Inject(MATERIAL_ROLL_REPOSITORY)
    private readonly materialRolls: MaterialRollRepositoryInterface,
    @Inject(INVENTORY_USAGE_REPOSITORY)
    private readonly usages: InventoryUsageRepositoryInterface,
    @Inject(SERVICE_DEFAULTS_REPOSITORY)
    private readonly serviceDefaults: ServiceDefaultsRepositoryInterface
  ) {}

  findAll(branchId: string, dto: ListInventoryDto): Promise<InventoryPage> {
    return this.inventory.findAll(branchId, {
      type: dto.type,
      supplierId: dto.supplierId,
      brandId: dto.brandId,
      lowStock: dto.lowStock,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, branchId: string): Promise<InventoryRecord> {
    const record = await this.inventory.findById(id, branchId)
    if (!record) throw new NotFoundException({ error: 'inventory_not_found' })
    return record
  }

  createItem(
    branchId: string,
    dto: CreateInventoryItemDto
  ): Promise<InventoryRecord> {
    return this.inventoryItems.create({
      branchId,
      name: dto.name,
      supplierId: dto.supplierId,
      brandId: dto.brandId,
      unitCost: dto.unitCost,
      sku: dto.sku,
      description: dto.description,
      stock: dto.stock,
      unit: dto.unit,
      lowStockAlert: dto.lowStockAlert,
    })
  }

  async updateItem(
    id: string,
    branchId: string,
    dto: UpdateInventoryItemDto
  ): Promise<InventoryRecord> {
    await this.findOne(id, branchId)
    return this.inventoryItems.update(id, branchId, dto)
  }

  async removeItem(id: string, branchId: string): Promise<void> {
    await this.findOne(id, branchId)
    const inUse = await this.inventory.hasActiveUsages(id)
    if (inUse) throw new ConflictException({ error: 'inventory_in_use' })
    return this.inventoryItems.delete(id, branchId)
  }

  createRoll(
    branchId: string,
    dto: CreateMaterialRollDto
  ): Promise<InventoryRecord> {
    return this.materialRolls.create({
      branchId,
      name: dto.name,
      supplierId: dto.supplierId,
      brandId: dto.brandId,
      unitCost: dto.unitCost,
      series: dto.series,
      finish: dto.finish,
      color: dto.color,
      width: dto.width,
      remainingLength: dto.remainingLength,
      lotNumber: dto.lotNumber,
    })
  }

  async updateRoll(
    id: string,
    branchId: string,
    dto: UpdateMaterialRollDto
  ): Promise<InventoryRecord> {
    await this.findOne(id, branchId)
    return this.materialRolls.update(id, branchId, dto)
  }

  async removeRoll(id: string, branchId: string): Promise<void> {
    await this.findOne(id, branchId)
    const inUse = await this.inventory.hasActiveUsages(id)
    if (inUse) throw new ConflictException({ error: 'inventory_in_use' })
    return this.materialRolls.delete(id, branchId)
  }

  async findUsages(
    id: string,
    branchId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    await this.findOne(id, branchId)
    return this.usages.findAllByInventory(id)
  }

  async maybeCreateUsage(
    workOrderId: string,
    serviceId: string
  ): Promise<void> {
    const defaults = await this.serviceDefaults.getInventoryDefaults(serviceId)
    if (!defaults) return

    const inv = await this.inventory.findByIdDirect(defaults.inventoryId)
    if (!inv) return

    await this.usages.create({
      workOrderId,
      inventoryId: defaults.inventoryId,
      quantityUsed: Number(defaults.defaultQuantity),
      costAtUsage: Number(inv.unitCost),
    })
  }

  async updateUsage(
    workOrderId: string,
    usageId: string,
    quantityUsed: number
  ): Promise<Prisma.InventoryUsageModel> {
    const usage = await this.usages.findById(usageId, workOrderId)
    if (!usage)
      throw new NotFoundException({ error: 'inventory_usage_not_found' })
    return this.usages.update(
      usageId,
      workOrderId,
      new Prisma.Decimal(quantityUsed)
    )
  }

  commitUsages(workOrderId: string): Promise<CommitUsagesResult> {
    return this.usages.commitAll(workOrderId)
  }

  deleteUsagesByWorkOrder(workOrderId: string): Promise<void> {
    return this.usages.deleteByWorkOrder(workOrderId)
  }

  async applyReceive(
    inventoryId: string,
    quantity: number,
    unitCost: number
  ): Promise<void> {
    const inv = await this.inventory.findByIdDirect(inventoryId)
    if (!inv) throw new NotFoundException({ error: 'inventory_not_found' })
    const qty = new Prisma.Decimal(quantity)
    const cost = new Prisma.Decimal(unitCost)
    if (inv.type === InventoryType.ITEM) {
      await this.inventoryItems.incrementStock(inv.id, qty, cost)
    } else {
      await this.materialRolls.incrementLength(inv.id, qty, cost)
    }
  }
}
