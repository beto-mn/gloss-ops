import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrderWarrantiesController } from './work-order-warranties.controller'
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

describe('WorkOrderWarrantiesController', () => {
  let controller: WorkOrderWarrantiesController
  let service: { findByWorkOrder: jest.Mock }

  beforeEach(async () => {
    service = { findByWorkOrder: jest.fn().mockResolvedValue([]) }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderWarrantiesController],
      providers: [{ provide: WarrantyService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrderWarrantiesController)
  })

  describe('findAll', () => {
    it('calls service.findByWorkOrder with workOrderId and organizationId', async () => {
      await controller.findAll('wo-1', OWNER)
      expect(service.findByWorkOrder).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })
})
