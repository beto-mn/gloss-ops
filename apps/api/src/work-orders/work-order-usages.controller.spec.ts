import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InventoryService } from '../inventory/inventory.service'

import { WorkOrderUsagesController } from './work-order-usages.controller'
import { WorkOrdersService } from './work-orders.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('WorkOrderUsagesController', () => {
  let controller: WorkOrderUsagesController
  let inventoryService: { updateUsage: jest.Mock }
  let workOrdersService: { findOne: jest.Mock }

  beforeEach(async () => {
    inventoryService = { updateUsage: jest.fn().mockResolvedValue({}) }
    workOrdersService = { findOne: jest.fn().mockResolvedValue({ id: 'wo-1' }) }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderUsagesController],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: WorkOrdersService, useValue: workOrdersService },
      ],
    }).compile()
    controller = module.get(WorkOrderUsagesController)
  })

  it('verifies work order ownership before updating usage', async () => {
    const account = makeAccount(Role.TECHNICIAN)
    const dto = { quantityUsed: 2.5 } as never
    await controller.update(account, 'wo-1', 'usage-1', dto)
    expect(workOrdersService.findOne).toHaveBeenCalledWith('wo-1', 'org-1')
  })

  it('passes workOrderId, usageId, and quantityUsed to inventoryService', async () => {
    const dto = { quantityUsed: 2.5 } as never
    await controller.update(
      makeAccount(Role.TECHNICIAN),
      'wo-1',
      'usage-1',
      dto
    )
    expect(inventoryService.updateUsage).toHaveBeenCalledWith(
      'wo-1',
      'usage-1',
      2.5
    )
  })
})
