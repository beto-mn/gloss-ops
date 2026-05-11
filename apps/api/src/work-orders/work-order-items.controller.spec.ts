import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrderItemsController } from './work-order-items.controller'
import { WorkOrdersService } from './work-orders.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)
const MANAGER = makeAccount(Role.MANAGER)

describe('WorkOrderItemsController', () => {
  let controller: WorkOrderItemsController
  let service: {
    getItems: jest.Mock
    addItem: jest.Mock
    updateItem: jest.Mock
    removeItem: jest.Mock
  }

  beforeEach(async () => {
    service = {
      getItems: jest.fn().mockResolvedValue([]),
      addItem: jest.fn().mockResolvedValue({}),
      updateItem: jest.fn().mockResolvedValue({}),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderItemsController],
      providers: [{ provide: WorkOrdersService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrderItemsController)
  })

  describe('getItems', () => {
    it('passes workOrderId and organizationId to service', async () => {
      await controller.getItems(OWNER, 'wo-1')
      expect(service.getItems).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })

  describe('addItem', () => {
    it('passes workOrderId, organizationId, and dto', async () => {
      const dto = { serviceId: 'svc-1', unitPrice: 100, quantity: 1 } as never
      await controller.addItem(MANAGER, 'wo-1', dto)
      expect(service.addItem).toHaveBeenCalledWith('wo-1', 'org-1', dto)
    })
  })

  describe('updateItem', () => {
    it('passes workOrderId, itemId, organizationId, and dto', async () => {
      const dto = { quantity: 2 } as never
      await controller.updateItem(MANAGER, 'wo-1', 'item-1', dto)
      expect(service.updateItem).toHaveBeenCalledWith(
        'wo-1',
        'item-1',
        'org-1',
        dto
      )
    })
  })

  describe('removeItem', () => {
    it('passes workOrderId, itemId, and organizationId', async () => {
      await controller.removeItem(OWNER, 'wo-1', 'item-1')
      expect(service.removeItem).toHaveBeenCalledWith('wo-1', 'item-1', 'org-1')
    })
  })
})
