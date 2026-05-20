import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { AssetWarrantiesController } from './asset-warranties.controller'
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

describe('AssetWarrantiesController', () => {
  let controller: AssetWarrantiesController
  let service: { findByAsset: jest.Mock }

  beforeEach(async () => {
    service = { findByAsset: jest.fn().mockResolvedValue([]) }
    const module = await Test.createTestingModule({
      controllers: [AssetWarrantiesController],
      providers: [{ provide: WarrantyService, useValue: service }],
    }).compile()
    controller = module.get(AssetWarrantiesController)
  })

  describe('findAll', () => {
    it('calls service.findByAsset with assetId and organizationId', async () => {
      await controller.findAll('asset-1', OWNER)
      expect(service.findByAsset).toHaveBeenCalledWith('asset-1', 'org-1')
    })
  })
})
