import { Test } from '@nestjs/testing'

import { Role, WorkOrderStatus } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrdersController } from './work-orders.controller'
import { WorkOrdersService } from './work-orders.service'

const makeAccount = (role: Role, branchId = 'branch-1'): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId,
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)
const MANAGER = makeAccount(Role.MANAGER)

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    transition: jest.Mock
    remove: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ items: [] }),
      update: jest.fn().mockResolvedValue({}),
      transition: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [WorkOrdersController],
      providers: [{ provide: WorkOrdersService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrdersController)
  })

  describe('create', () => {
    it('passes branchId and organizationId from account', async () => {
      const dto = { assetId: 'asset-1' } as never
      await controller.create(OWNER, dto)
      expect(service.create).toHaveBeenCalledWith('branch-1', 'org-1', dto)
    })
  })

  describe('findAll', () => {
    it('passes organizationId from account', async () => {
      await controller.findAll(MANAGER, {} as never)
      expect(service.findAll).toHaveBeenCalledWith('org-1', {})
    })
  })

  describe('findOne', () => {
    it('passes id and organizationId', async () => {
      await controller.findOne(OWNER, 'wo-1')
      expect(service.findOne).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })

  describe('update', () => {
    it('passes id, organizationId, and dto', async () => {
      await controller.update(MANAGER, 'wo-1', { note: 'updated' } as never)
      expect(service.update).toHaveBeenCalledWith('wo-1', 'org-1', {
        note: 'updated',
      })
    })
  })

  describe('transition', () => {
    it('passes id, organizationId, and new status', async () => {
      await controller.transition(MANAGER, 'wo-1', {
        status: WorkOrderStatus.CONFIRMED,
      } as never)
      expect(service.transition).toHaveBeenCalledWith(
        'wo-1',
        'org-1',
        WorkOrderStatus.CONFIRMED
      )
    })
  })

  describe('remove', () => {
    it('passes id and organizationId', async () => {
      await controller.remove(OWNER, 'wo-1')
      expect(service.remove).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })
})
