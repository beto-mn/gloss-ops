import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('InventoryController', () => {
  let controller: InventoryController
  let service: { findAll: jest.Mock; findUsages: jest.Mock }

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findUsages: jest.fn().mockResolvedValue([]),
    }
    const module = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: service }],
    }).compile()
    controller = module.get(InventoryController)
  })

  describe('findAll', () => {
    it('passes branchId from account', async () => {
      const dto = {} as never
      await controller.findAll(makeAccount(Role.OWNER), dto)
      expect(service.findAll).toHaveBeenCalledWith('branch-1', dto)
    })
  })

  describe('findUsages', () => {
    it('passes id and branchId from account', async () => {
      await controller.findUsages(makeAccount(Role.MANAGER), 'inv-1')
      expect(service.findUsages).toHaveBeenCalledWith('inv-1', 'branch-1')
    })
  })
})
