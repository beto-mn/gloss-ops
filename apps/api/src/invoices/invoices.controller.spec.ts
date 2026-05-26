import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'
import type { CreateInvoiceDto, ListInvoicesDto, UpdateInvoiceDto } from './dto'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('InvoicesController', () => {
  let controller: InvoicesController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    transition: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
      findOne: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      transition: jest.fn().mockResolvedValue({}),
    }
    const module = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: service }],
    }).compile()
    controller = module.get(InvoicesController)
  })

  describe('create', () => {
    it('calls service.create with branchId, organizationId, dto, and accountId', async () => {
      const dto: CreateInvoiceDto = { workOrderId: 'wo-1' }
      await controller.create(OWNER, dto)
      expect(service.create).toHaveBeenCalledWith(
        'branch-1',
        'org-1',
        dto,
        'acc-1'
      )
    })
  })

  describe('findAll', () => {
    it('calls service.findAll with branchId and dto', async () => {
      const dto: ListInvoicesDto = { page: 1, limit: 20 }
      await controller.findAll(OWNER, dto)
      expect(service.findAll).toHaveBeenCalledWith('branch-1', dto)
    })
  })

  describe('findOne', () => {
    it('calls service.findOne with id and branchId', async () => {
      await controller.findOne('inv-1', OWNER)
      expect(service.findOne).toHaveBeenCalledWith('inv-1', 'branch-1')
    })
  })

  describe('update', () => {
    it('calls service.update with id, branchId, and dto', async () => {
      const dto: UpdateInvoiceDto = { customerName: 'Empresa SA' }
      await controller.update('inv-1', OWNER, dto)
      expect(service.update).toHaveBeenCalledWith('inv-1', 'branch-1', dto)
    })
  })

  describe('transition', () => {
    it('calls service.transition with id, branchId, organizationId, status, and accountId', async () => {
      const dto = { status: 'ISSUED' as any }
      await controller.transition('inv-1', OWNER, dto)
      expect(service.transition).toHaveBeenCalledWith(
        'inv-1',
        'branch-1',
        'org-1',
        'ISSUED',
        'acc-1'
      )
    })
  })
})
