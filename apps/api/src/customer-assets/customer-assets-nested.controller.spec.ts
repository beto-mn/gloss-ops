import { Test } from '@nestjs/testing'

import { AssetType, Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { CustomerAssetsNestedController } from './customer-assets-nested.controller'
import { CustomerAssetsService } from './customer-assets.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('CustomerAssetsNestedController', () => {
  let controller: CustomerAssetsNestedController
  let service: {
    create: jest.Mock
    findAllByCustomer: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'asset-1' }),
      findAllByCustomer: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    }
    const module = await Test.createTestingModule({
      controllers: [CustomerAssetsNestedController],
      providers: [{ provide: CustomerAssetsService, useValue: service }],
    }).compile()
    controller = module.get(CustomerAssetsNestedController)
  })

  describe('create', () => {
    it('calls service.create with organizationId, customerId, and dto', () => {
      const account = makeAccount(Role.MANAGER)
      const dto = { assetType: AssetType.VEHICLE }
      void controller.create(account, 'cust-1', dto as never)
      expect(service.create).toHaveBeenCalledWith('org-1', 'cust-1', dto)
    })
  })

  describe('findAll', () => {
    it('calls service.findAllByCustomer with organizationId, customerId, and dto', () => {
      const account = makeAccount(Role.FRONT_DESK)
      void controller.findAll(account, 'cust-1', {})
      expect(service.findAllByCustomer).toHaveBeenCalledWith(
        'org-1',
        'cust-1',
        {}
      )
    })
  })
})
