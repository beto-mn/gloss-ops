// apps/api/src/inventory/inventory.service.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { InventoryType } from '@glossops/database'

import { InMemoryInventoryUsageRepository } from './infrastructure/in-memory-inventory-usage.repository'
import { InMemoryInventoryItemRepository } from './infrastructure/in-memory-inventory-item.repository'
import { InMemoryMaterialRollRepository } from './infrastructure/in-memory-material-roll.repository'
import { InMemoryServiceDefaultsRepository } from './infrastructure/in-memory-service-defaults.repository'
import { InMemoryInventoryRepository } from './infrastructure/in-memory-inventory.repository'
import { InventoryService } from './inventory.service'
import {
  INVENTORY_ITEM_REPOSITORY,
  INVENTORY_REPOSITORY,
  INVENTORY_USAGE_REPOSITORY,
  MATERIAL_ROLL_REPOSITORY,
  SERVICE_DEFAULTS_REPOSITORY,
} from './inventory.tokens'

const BRANCH = 'branch-1'
const OTHER_BRANCH = 'branch-2'
const SVC = 'service-1'
const SVC_NO_INV = 'service-no-inv'
const WO = 'work-order-1'

describe('InventoryService', () => {
  let service: InventoryService
  let invRepo: InMemoryInventoryRepository
  let itemRepo: InMemoryInventoryItemRepository
  let rollRepo: InMemoryMaterialRollRepository
  let usageRepo: InMemoryInventoryUsageRepository
  let defaultsRepo: InMemoryServiceDefaultsRepository

  beforeEach(async () => {
    invRepo = new InMemoryInventoryRepository()
    itemRepo = new InMemoryInventoryItemRepository(invRepo.store)
    rollRepo = new InMemoryMaterialRollRepository(invRepo.store)
    usageRepo = new InMemoryInventoryUsageRepository()
    defaultsRepo = new InMemoryServiceDefaultsRepository()

    usageRepo.setInventoryGetter(id => invRepo.findByIdDirect(id))
    usageRepo.setItemDecrementer((id, qty) => itemRepo.decrementStock(id, qty))
    usageRepo.setRollDecrementer((id, qty) => rollRepo.decrementLength(id, qty))
    invRepo.setActiveUsagesChecker(async id => {
      const usages = await usageRepo.findAllByInventory(id)
      return usages.length > 0
    })

    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: INVENTORY_REPOSITORY, useValue: invRepo },
        { provide: INVENTORY_ITEM_REPOSITORY, useValue: itemRepo },
        { provide: MATERIAL_ROLL_REPOSITORY, useValue: rollRepo },
        { provide: INVENTORY_USAGE_REPOSITORY, useValue: usageRepo },
        { provide: SERVICE_DEFAULTS_REPOSITORY, useValue: defaultsRepo },
      ],
    }).compile()

    service = module.get(InventoryService)
  })

  // ── InventoryItem CRUD ──────────────────────────────────────────────────

  describe('createItem', () => {
    it('creates an ITEM record with type ITEM', async () => {
      const record = await service.createItem(BRANCH, {
        name: 'Desengrasante',
        unit: 'lt',
        stock: 5,
      })
      expect(record.type).toBe(InventoryType.ITEM)
      expect(record.inventoryItem).not.toBeNull()
      expect(record.materialRoll).toBeNull()
      expect(Number(record.inventoryItem!.stock)).toBe(5)
    })
  })

  describe('updateItem', () => {
    it('updates name and stock', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      const updated = await service.updateItem(created.id, BRANCH, {
        name: 'B',
        stock: 10,
      })
      expect(updated.name).toBe('B')
      expect(Number(updated.inventoryItem!.stock)).toBe(10)
    })

    it('clears supplierId with null', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
        supplierId: 'sup-1',
      })
      const updated = await service.updateItem(created.id, BRANCH, {
        supplierId: null,
      })
      expect(updated.supplierId).toBeNull()
    })

    it('throws 404 when item not found', async () => {
      await expect(
        service.updateItem('nonexistent', BRANCH, { name: 'X' })
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('removeItem', () => {
    it('deletes item with no active usages', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      await service.removeItem(created.id, BRANCH)
      await expect(service.findOne(created.id, BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws 409 when item has active usages', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: created.id,
        quantityUsed: 1,
        costAtUsage: 10,
      })
      await expect(service.removeItem(created.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws 404 for item in another branch', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      await expect(
        service.removeItem(created.id, OTHER_BRANCH)
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ── MaterialRoll CRUD ───────────────────────────────────────────────────

  describe('createRoll', () => {
    it('creates a ROLL record with type ROLL', async () => {
      const record = await service.createRoll(BRANCH, {
        name: 'Vinil Negro 1.52m',
        series: '1080',
        finish: 'Gloss',
        color: 'Jet Black',
        width: 1.52,
        remainingLength: 25,
      })
      expect(record.type).toBe(InventoryType.ROLL)
      expect(record.materialRoll).not.toBeNull()
      expect(record.inventoryItem).toBeNull()
      expect(Number(record.materialRoll!.remainingLength)).toBe(25)
    })
  })

  describe('removeRoll', () => {
    it('throws 409 when roll has active usages', async () => {
      const roll = await service.createRoll(BRANCH, {
        name: 'R',
        series: 'S',
        finish: 'F',
        color: 'C',
        width: 1.52,
        remainingLength: 10,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: roll.id,
        quantityUsed: 2,
        costAtUsage: 50,
      })
      await expect(service.removeRoll(roll.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })
  })

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('filters by type ITEM', async () => {
      await service.createItem(BRANCH, { name: 'Item', unit: 'pza' })
      await service.createRoll(BRANCH, {
        name: 'Roll',
        series: 'S',
        finish: 'F',
        color: 'C',
        width: 1.52,
        remainingLength: 5,
      })
      const result = await service.findAll(BRANCH, {
        type: InventoryType.ITEM,
        page: 1,
        limit: 20,
      })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].type).toBe(InventoryType.ITEM)
    })

    it('filters lowStock=true for items below threshold', async () => {
      await service.createItem(BRANCH, {
        name: 'Low',
        unit: 'pza',
        stock: 2,
        lowStockAlert: 5,
      })
      await service.createItem(BRANCH, {
        name: 'Ok',
        unit: 'pza',
        stock: 10,
        lowStockAlert: 5,
      })
      const result = await service.findAll(BRANCH, {
        lowStock: true,
        page: 1,
        limit: 20,
      })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Low')
    })

    it('does not return inventory from another branch', async () => {
      await service.createItem(OTHER_BRANCH, { name: 'Other', unit: 'pza' })
      const result = await service.findAll(BRANCH, { page: 1, limit: 20 })
      expect(result.data).toHaveLength(0)
    })
  })

  // ── InventoryUsage lifecycle ────────────────────────────────────────────

  describe('maybeCreateUsage', () => {
    it('does nothing when service has no default inventory', async () => {
      await service.maybeCreateUsage(WO, SVC_NO_INV)
      const usages = await usageRepo.findAllByWorkOrder(WO)
      expect(usages).toHaveLength(0)
    })

    it('creates usage with costAtUsage snapshot when default exists', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Polish',
        unit: 'ml',
        unitCost: 25,
      })
      defaultsRepo.seed(SVC, item.id, 50)

      await service.maybeCreateUsage(WO, SVC)

      const usages = await usageRepo.findAllByWorkOrder(WO)
      expect(usages).toHaveLength(1)
      expect(Number(usages[0].quantityUsed)).toBe(50)
      expect(Number(usages[0].costAtUsage)).toBe(25)
    })
  })

  describe('updateUsage', () => {
    it('updates quantityUsed', async () => {
      const item = await service.createItem(BRANCH, { name: 'A', unit: 'pza' })
      defaultsRepo.seed(SVC, item.id, 1)
      await service.maybeCreateUsage(WO, SVC)
      const [usage] = await usageRepo.findAllByWorkOrder(WO)

      const updated = await service.updateUsage(WO, usage.id, 3.5)
      expect(Number(updated.quantityUsed)).toBe(3.5)
    })

    it('throws 404 when usage does not belong to the work order', async () => {
      const item = await service.createItem(BRANCH, { name: 'A', unit: 'pza' })
      defaultsRepo.seed(SVC, item.id, 1)
      await service.maybeCreateUsage('other-wo', SVC)
      const [usage] = await usageRepo.findAllByWorkOrder('other-wo')

      await expect(service.updateUsage(WO, usage.id, 2)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('commitUsages', () => {
    it('decrements stock for InventoryItem', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Oil',
        unit: 'lt',
        stock: 10,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 3,
        costAtUsage: 50,
      })

      await service.commitUsages(WO)

      const updated = invRepo.store.get(item.id)!
      expect(Number(updated.inventoryItem!.stock)).toBe(7)
    })

    it('decrements remainingLength for MaterialRoll', async () => {
      const roll = await service.createRoll(BRANCH, {
        name: 'Wrap',
        series: 'S',
        finish: 'F',
        color: 'C',
        width: 1.52,
        remainingLength: 20,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: roll.id,
        quantityUsed: 4.5,
        costAtUsage: 200,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(0)
      const updated = invRepo.store.get(roll.id)!
      expect(Number(updated.materialRoll!.remainingLength)).toBe(15.5)
    })

    it('returns warning when stock goes negative', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Scarce',
        unit: 'pza',
        stock: 1,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 5,
        costAtUsage: 10,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('Scarce')
    })

    it('returns warning when stock falls to or below lowStockAlert', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'LowStock',
        unit: 'pza',
        stock: 5,
        lowStockAlert: 3,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 2,
        costAtUsage: 10,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('LowStock')
    })

    it('completes with no warnings when stock is fine', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Plenty',
        unit: 'pza',
        stock: 100,
        lowStockAlert: 5,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 1,
        costAtUsage: 10,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('deleteUsagesByWorkOrder', () => {
    it('removes all usages without touching stock', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
        stock: 10,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 3,
        costAtUsage: 50,
      })

      await service.deleteUsagesByWorkOrder(WO)

      const usages = await usageRepo.findAllByWorkOrder(WO)
      expect(usages).toHaveLength(0)
      expect(Number(invRepo.store.get(item.id)!.inventoryItem!.stock)).toBe(10)
    })
  })
})
