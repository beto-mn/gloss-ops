import { ForbiddenException } from '@nestjs/common'
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
    it('throws ForbiddenException when Manager attempts permanent delete', () => {
      const account = makeAccount(Role.MANAGER)
      expect(() => controller.remove(account, 'cust-1', 'true')).toThrow(
        ForbiddenException
      )
      expect(service.remove).not.toHaveBeenCalled()
    })

    it('calls service.remove with permanent=true when Owner', () => {
      const account = makeAccount(Role.OWNER)
      void controller.remove(account, 'cust-1', 'true')
      expect(service.remove).toHaveBeenCalledWith('cust-1', 'org-1', true)
    })

    it('calls service.remove with permanent=false when Manager does soft delete', () => {
      const account = makeAccount(Role.MANAGER)
      void controller.remove(account, 'cust-1', undefined)
      expect(service.remove).toHaveBeenCalledWith('cust-1', 'org-1', false)
    })
  })
})
