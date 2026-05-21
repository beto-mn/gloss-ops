import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WarrantiesController } from './warranties.controller'
import { WarrantyService } from './warranties.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('WarrantiesController', () => {
  let controller: WarrantiesController
  let service: { findOne: jest.Mock; void: jest.Mock }

  beforeEach(async () => {
    service = {
      findOne: jest.fn().mockResolvedValue({}),
      void: jest.fn().mockResolvedValue({}),
    }
    const module = await Test.createTestingModule({
      controllers: [WarrantiesController],
      providers: [{ provide: WarrantyService, useValue: service }],
    }).compile()
    controller = module.get(WarrantiesController)
  })

  describe('findOne', () => {
    it('calls service.findOne with id and organizationId', async () => {
      await controller.findOne('w-1', OWNER)
      expect(service.findOne).toHaveBeenCalledWith('w-1', 'org-1')
    })
  })

  describe('void', () => {
    it('calls service.void with id, reason, organizationId, and accountId', async () => {
      await controller.void('w-1', { reason: 'Damage' }, OWNER)
      expect(service.void).toHaveBeenCalledWith(
        'w-1',
        'Damage',
        'org-1',
        'acc-1'
      )
    })
  })
})
