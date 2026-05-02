import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { CustomerAssetsController } from './customer-assets.controller'
import { CustomerAssetsService } from './customer-assets.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('CustomerAssetsController', () => {
  let controller: CustomerAssetsController
  let service: { remove: jest.Mock; findOne: jest.Mock; update: jest.Mock }

  beforeEach(async () => {
    service = {
      remove: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue({ id: 'asset-1' }),
      update: jest.fn().mockResolvedValue({ id: 'asset-1' }),
    }
    const module = await Test.createTestingModule({
      controllers: [CustomerAssetsController],
      providers: [{ provide: CustomerAssetsService, useValue: service }],
    }).compile()
    controller = module.get(CustomerAssetsController)
  })

  describe('remove', () => {
    it('throws ForbiddenException when Manager attempts permanent delete', () => {
      const account = makeAccount(Role.MANAGER)
      expect(() => controller.remove(account, 'asset-1', 'true')).toThrow(
        ForbiddenException
      )
      expect(service.remove).not.toHaveBeenCalled()
    })

    it('calls service.remove with permanent=true when Owner', () => {
      const account = makeAccount(Role.OWNER)
      void controller.remove(account, 'asset-1', 'true')
      expect(service.remove).toHaveBeenCalledWith('asset-1', 'org-1', true)
    })

    it('calls service.remove with permanent=false when Manager does soft delete', () => {
      const account = makeAccount(Role.MANAGER)
      void controller.remove(account, 'asset-1', undefined)
      expect(service.remove).toHaveBeenCalledWith('asset-1', 'org-1', false)
    })
  })

  describe('findOne', () => {
    it('calls service.findOne with id and organizationId', () => {
      const account = makeAccount(Role.FRONT_DESK)
      void controller.findOne(account, 'asset-1')
      expect(service.findOne).toHaveBeenCalledWith('asset-1', 'org-1')
    })
  })

  describe('update', () => {
    it('calls service.update with id, organizationId, and dto', () => {
      const account = makeAccount(Role.MANAGER)
      void controller.update(account, 'asset-1', { model: 'Camry' } as never)
      expect(service.update).toHaveBeenCalledWith('asset-1', 'org-1', {
        model: 'Camry',
      })
    })
  })
})
