import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InventoryItemsController } from './inventory-items.controller'
import { InventoryService } from './inventory.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('InventoryItemsController', () => {
  let controller: InventoryItemsController
  let service: {
    createItem: jest.Mock
    updateItem: jest.Mock
    removeItem: jest.Mock
  }

  beforeEach(async () => {
    service = {
      createItem: jest.fn().mockResolvedValue({}),
      updateItem: jest.fn().mockResolvedValue({}),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [InventoryItemsController],
      providers: [{ provide: InventoryService, useValue: service }],
    }).compile()
    controller = module.get(InventoryItemsController)
  })

  it('create passes branchId from account', async () => {
    const dto = { name: 'A', unit: 'pza' } as never
    await controller.create(makeAccount(Role.OWNER), dto)
    expect(service.createItem).toHaveBeenCalledWith('branch-1', dto)
  })

  it('update passes id and branchId from account', async () => {
    await controller.update(makeAccount(Role.MANAGER), 'inv-1', {
      name: 'B',
    } as never)
    expect(service.updateItem).toHaveBeenCalledWith('inv-1', 'branch-1', {
      name: 'B',
    })
  })

  it('remove passes id and branchId from account', async () => {
    await controller.remove(makeAccount(Role.OWNER), 'inv-1')
    expect(service.removeItem).toHaveBeenCalledWith('inv-1', 'branch-1')
  })
})
