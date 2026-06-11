import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { CustomersController } from './customers.controller'
import { CustomersService } from './customers.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('CustomersController', () => {
  let controller: CustomersController
  let service: { remove: jest.Mock }

  beforeEach(async () => {
    service = { remove: jest.fn().mockResolvedValue(undefined) }
    const module = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: service }],
    }).compile()
    controller = module.get(CustomersController)
  })

  describe('remove', () => {
    it('calls service.remove with id and organizationId (no permanent flag)', () => {
      const account = makeAccount(Role.MANAGER)
      void controller.remove(account, 'cust-1')
      expect(service.remove).toHaveBeenCalledWith('cust-1', 'org-1')
    })

    it('calls service.remove for an Owner identically (no role-based hard-delete branch)', () => {
      const account = makeAccount(Role.OWNER)
      void controller.remove(account, 'cust-1')
      expect(service.remove).toHaveBeenCalledWith('cust-1', 'org-1')
    })
  })
})
