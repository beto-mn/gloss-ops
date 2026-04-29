import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { BranchesController } from './branches.controller'
import { BranchesService } from './branches.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('BranchesController', () => {
  let controller: BranchesController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    remove: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'b-1', name: 'A' }),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ id: 'b-1' }),
      update: jest.fn().mockResolvedValue({ id: 'b-1', name: 'B' }),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [BranchesController],
      providers: [{ provide: BranchesService, useValue: service }],
    }).compile()
    controller = module.get(BranchesController)
  })

  it('forwards create to the service with organizationId from the account', async () => {
    const account = makeAccount(Role.OWNER)
    await controller.create(account, { name: 'CDMX' })
    expect(service.create).toHaveBeenCalledWith('org-1', { name: 'CDMX' })
  })

  it('forwards findAll with the DTO', async () => {
    const account = makeAccount(Role.TECHNICIAN)
    await controller.findAll(account, { status: 'ACTIVE' })
    expect(service.findAll).toHaveBeenCalledWith('org-1', { status: 'ACTIVE' })
  })

  it('forwards findOne by id', async () => {
    const account = makeAccount(Role.FRONT_DESK)
    await controller.findOne(account, 'b-1')
    expect(service.findOne).toHaveBeenCalledWith('b-1', 'org-1')
  })

  it('forwards update with the DTO', async () => {
    const account = makeAccount(Role.MANAGER)
    await controller.update(account, 'b-1', { name: 'New' })
    expect(service.update).toHaveBeenCalledWith('b-1', 'org-1', {
      name: 'New',
    })
  })

  it('forwards remove without permanent flag', async () => {
    const account = makeAccount(Role.OWNER)
    await controller.remove(account, 'b-1')
    expect(service.remove).toHaveBeenCalledWith('b-1', 'org-1')
  })
})
