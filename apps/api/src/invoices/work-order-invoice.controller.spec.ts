import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrderInvoiceController } from './work-order-invoice.controller'
import { InvoicesService } from './invoices.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('WorkOrderInvoiceController', () => {
  let controller: WorkOrderInvoiceController
  let service: { findByWorkOrder: jest.Mock }

  beforeEach(async () => {
    service = { findByWorkOrder: jest.fn().mockResolvedValue({}) }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderInvoiceController],
      providers: [{ provide: InvoicesService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrderInvoiceController)
  })

  describe('findByWorkOrder', () => {
    it('calls service.findByWorkOrder with workOrderId and branchId', async () => {
      await controller.findByWorkOrder('wo-1', OWNER)
      expect(service.findByWorkOrder).toHaveBeenCalledWith('wo-1', 'branch-1')
    })
  })
})
