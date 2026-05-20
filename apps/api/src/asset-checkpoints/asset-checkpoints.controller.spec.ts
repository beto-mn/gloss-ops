import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { AssetCheckpointsController } from './asset-checkpoints.controller'
import { AssetCheckpointsService } from './asset-checkpoints.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)

describe('AssetCheckpointsController', () => {
  let controller: AssetCheckpointsController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    remove: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [AssetCheckpointsController],
      providers: [{ provide: AssetCheckpointsService, useValue: service }],
    }).compile()
    controller = module.get(AssetCheckpointsController)
  })

  describe('create', () => {
    it('calls service.create with workOrderId, dto, sub, and organizationId', async () => {
      const dto = { notes: 'Front bumper wrapped' } as never
      await controller.create('wo-1', dto, OWNER)
      expect(service.create).toHaveBeenCalledWith('wo-1', dto, 'acc-1', 'org-1')
    })
  })

  describe('findAll', () => {
    it('calls service.findAll with workOrderId and organizationId', async () => {
      await controller.findAll('wo-1', OWNER)
      expect(service.findAll).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })

  describe('findOne', () => {
    it('calls service.findOne with workOrderId, id, and organizationId', async () => {
      await controller.findOne('wo-1', 'cp-1', OWNER)
      expect(service.findOne).toHaveBeenCalledWith('wo-1', 'cp-1', 'org-1')
    })
  })

  describe('update', () => {
    it('calls service.update with workOrderId, id, dto, and organizationId', async () => {
      const dto = { notes: 'Updated notes' } as never
      await controller.update('wo-1', 'cp-1', dto, OWNER)
      expect(service.update).toHaveBeenCalledWith('wo-1', 'cp-1', dto, 'org-1')
    })
  })

  describe('remove', () => {
    it('calls service.remove with workOrderId, id, and organizationId', async () => {
      await controller.remove('wo-1', 'cp-1', OWNER)
      expect(service.remove).toHaveBeenCalledWith('wo-1', 'cp-1', 'org-1')
    })
  })
})
