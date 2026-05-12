import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { MaterialRollsController } from './material-rolls.controller'
import { InventoryService } from './inventory.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('MaterialRollsController', () => {
  let controller: MaterialRollsController
  let service: {
    createRoll: jest.Mock
    updateRoll: jest.Mock
    removeRoll: jest.Mock
  }

  beforeEach(async () => {
    service = {
      createRoll: jest.fn().mockResolvedValue({}),
      updateRoll: jest.fn().mockResolvedValue({}),
      removeRoll: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [MaterialRollsController],
      providers: [{ provide: InventoryService, useValue: service }],
    }).compile()
    controller = module.get(MaterialRollsController)
  })

  it('create passes branchId from account', async () => {
    const dto = {
      name: 'R',
      series: 'S',
      finish: 'F',
      color: 'C',
      width: 1.52,
      remainingLength: 10,
    } as never
    await controller.create(makeAccount(Role.OWNER), dto)
    expect(service.createRoll).toHaveBeenCalledWith('branch-1', dto)
  })

  it('update passes id and branchId', async () => {
    await controller.update(makeAccount(Role.MANAGER), 'roll-1', {
      series: 'X',
    } as never)
    expect(service.updateRoll).toHaveBeenCalledWith('roll-1', 'branch-1', {
      series: 'X',
    })
  })

  it('remove passes id and branchId', async () => {
    await controller.remove(makeAccount(Role.OWNER), 'roll-1')
    expect(service.removeRoll).toHaveBeenCalledWith('roll-1', 'branch-1')
  })
})
