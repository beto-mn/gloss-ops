import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InventoryService } from '../inventory/inventory.service'

import { WorkOrderUsagesController } from './work-order-usages.controller'

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

  beforeEach(async () => {
    inventoryService = { updateUsage: jest.fn().mockResolvedValue({}) }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderUsagesController],
      providers: [{ provide: InventoryService, useValue: inventoryService }],
    }).compile()
    controller = module.get(WorkOrderUsagesController)
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
