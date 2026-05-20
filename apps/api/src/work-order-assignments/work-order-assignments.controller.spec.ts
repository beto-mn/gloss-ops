import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrderAssignmentsController } from './work-order-assignments.controller'
import { WorkOrderAssignmentsService } from './work-order-assignments.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)

describe('WorkOrderAssignmentsController', () => {
  let controller: WorkOrderAssignmentsController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    remove: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderAssignmentsController],
      providers: [{ provide: WorkOrderAssignmentsService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrderAssignmentsController)
  })

  describe('create', () => {
    it('calls service.create with workOrderId, dto, sub, and organizationId', async () => {
      const dto = { memberId: 'member-1' } as never
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

  describe('remove', () => {
    it('calls service.remove with workOrderId, id, and organizationId', async () => {
      await controller.remove('wo-1', 'assign-1', OWNER)
      expect(service.remove).toHaveBeenCalledWith('wo-1', 'assign-1', 'org-1')
    })
  })
})
