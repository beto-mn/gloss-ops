import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { PurchaseOrderStatus } from '@glossops/database'

import { InventoryService } from '../inventory/inventory.service'
import { InMemoryPurchaseOrderItemRepository } from './infrastructure/in-memory-purchase-order-item.repository'
import { InMemoryPurchaseOrderRepository } from './infrastructure/in-memory-purchase-order.repository'
import {
  PURCHASE_ORDER_ITEM_REPOSITORY,
  PURCHASE_ORDER_REPOSITORY,
} from './purchase-orders.tokens'
import { PurchaseOrdersService } from './purchase-orders.service'

const BRANCH = 'branch-1'
const OTHER_BRANCH = 'branch-2'
const SUPPLIER = 'supplier-1'
const INV_1 = 'inv-1'
const INV_2 = 'inv-2'

const makeCreateDto = (overrides?: object) => ({
  supplierId: SUPPLIER,
  items: [
    { inventoryId: INV_1, quantity: 10, unitCost: 5 },
    { inventoryId: INV_2, quantity: 5, unitCost: 20 },
  ],
  ...overrides,
})

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService
  let poRepo: InMemoryPurchaseOrderRepository
  let poItemRepo: InMemoryPurchaseOrderItemRepository
  let inventoryService: { applyReceive: jest.Mock }

  beforeEach(async () => {
    poRepo = new InMemoryPurchaseOrderRepository()
    poItemRepo = new InMemoryPurchaseOrderItemRepository(poRepo.store)
    inventoryService = { applyReceive: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PURCHASE_ORDER_REPOSITORY, useValue: poRepo },
        { provide: PURCHASE_ORDER_ITEM_REPOSITORY, useValue: poItemRepo },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile()

    service = module.get(PurchaseOrdersService)
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a DRAFT purchase order with items', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      expect(po.status).toBe(PurchaseOrderStatus.DRAFT)
      expect(po.branchId).toBe(BRANCH)
      expect(po.items).toHaveLength(2)
      expect(po.receivedAt).toBeNull()
    })
  })

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the order when found', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      const found = await service.findOne(created.id, BRANCH)
      expect(found.id).toBe(created.id)
    })

    it('throws NotFoundException when order not found', async () => {
      await expect(service.findOne('nonexistent', BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when order belongs to another branch', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      await expect(service.findOne(created.id, OTHER_BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates header fields when in DRAFT', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      const updated = await service.update(created.id, BRANCH, {
        note: 'Rush order',
      })
      expect(updated.note).toBe('Rush order')
    })

    it('throws ConflictException when not in DRAFT', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        created.id,
        PurchaseOrderStatus.RECEIVED,
        new Date(),
        []
      )
      await expect(
        service.update(created.id, BRANCH, { note: 'X' })
      ).rejects.toThrow(ConflictException)
    })
  })

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes a DRAFT order', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      await service.remove(created.id, BRANCH)
      await expect(service.findOne(created.id, BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when not in DRAFT', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        created.id,
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        null,
        []
      )
      await expect(service.remove(created.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })
  })

  // ── receive ───────────────────────────────────────────────────────────────

  describe('receive', () => {
    it('sets status to PARTIALLY_RECEIVED when not all items fully received', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const item1Id = po.items[0].id
      const result = await service.receive(po.id, BRANCH, {
        items: [{ itemId: item1Id, receivedQuantity: 5 }],
      })
      expect(result.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED)
      expect(result.receivedAt).toBeNull()
    })

    it('sets status to RECEIVED and sets receivedAt when all items fully received', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const result = await service.receive(po.id, BRANCH, {
        items: [
          { itemId: po.items[0].id, receivedQuantity: 10 },
          { itemId: po.items[1].id, receivedQuantity: 5 },
        ],
      })
      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED)
      expect(result.receivedAt).not.toBeNull()
    })

    it('accumulates receivedQuantity across multiple receive calls', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const item1Id = po.items[0].id
      const item2Id = po.items[1].id
      await service.receive(po.id, BRANCH, {
        items: [{ itemId: item1Id, receivedQuantity: 5 }],
      })
      const result = await service.receive(po.id, BRANCH, {
        items: [
          { itemId: item1Id, receivedQuantity: 5 },
          { itemId: item2Id, receivedQuantity: 5 },
        ],
      })
      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED)
    })

    it('calls inventoryService.applyReceive for each received item', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await service.receive(po.id, BRANCH, {
        items: [{ itemId: po.items[0].id, receivedQuantity: 3 }],
      })
      expect(inventoryService.applyReceive).toHaveBeenCalledTimes(1)
      expect(inventoryService.applyReceive).toHaveBeenCalledWith(INV_1, 3, 5)
    })

    it('throws ConflictException when order is RECEIVED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        po.id,
        PurchaseOrderStatus.RECEIVED,
        new Date(),
        []
      )
      await expect(
        service.receive(po.id, BRANCH, {
          items: [{ itemId: po.items[0].id, receivedQuantity: 1 }],
        })
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when order is CANCELLED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        po.id,
        PurchaseOrderStatus.CANCELLED,
        null,
        []
      )
      await expect(
        service.receive(po.id, BRANCH, {
          items: [{ itemId: po.items[0].id, receivedQuantity: 1 }],
        })
      ).rejects.toThrow(ConflictException)
    })

    it('throws BadRequestException when itemId does not belong to this order', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await expect(
        service.receive(po.id, BRANCH, {
          items: [{ itemId: 'unknown-item-id', receivedQuantity: 1 }],
        })
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancels a DRAFT order', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const result = await service.cancel(po.id, BRANCH)
      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED)
    })

    it('cancels a PARTIALLY_RECEIVED order', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await service.receive(po.id, BRANCH, {
        items: [{ itemId: po.items[0].id, receivedQuantity: 3 }],
      })
      const result = await service.cancel(po.id, BRANCH)
      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED)
    })

    it('throws ConflictException when order is RECEIVED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        po.id,
        PurchaseOrderStatus.RECEIVED,
        new Date(),
        []
      )
      await expect(service.cancel(po.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when order is already CANCELLED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await service.cancel(po.id, BRANCH)
      await expect(service.cancel(po.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })
  })
})
