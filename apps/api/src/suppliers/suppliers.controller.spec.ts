import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { SuppliersController } from './suppliers.controller'
import { SuppliersService } from './suppliers.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)
const MANAGER = makeAccount(Role.MANAGER)

describe('SuppliersController', () => {
  let controller: SuppliersController
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
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: service }],
    }).compile()
    controller = module.get(SuppliersController)
  })

  describe('create', () => {
    it('calls service.create with organizationId from account', async () => {
      await controller.create(OWNER, { name: 'Avery Dennison MX' } as never)
      expect(service.create).toHaveBeenCalledWith('org-1', {
        name: 'Avery Dennison MX',
      })
    })
  })

  describe('findAll', () => {
    it('calls service.findAll with organizationId from account', async () => {
      await controller.findAll(MANAGER, {} as never)
      expect(service.findAll).toHaveBeenCalledWith('org-1', {})
    })
  })

  describe('findOne', () => {
    it('calls service.findOne with id and organizationId', async () => {
      await controller.findOne(OWNER, 'sup-1')
      expect(service.findOne).toHaveBeenCalledWith('sup-1', 'org-1')
    })
  })

  describe('update', () => {
    it('calls service.update with id and organizationId', async () => {
      await controller.update(MANAGER, 'sup-1', {
        name: 'Avery Elite',
      } as never)
      expect(service.update).toHaveBeenCalledWith('sup-1', 'org-1', {
        name: 'Avery Elite',
      })
    })
  })

  describe('remove', () => {
    it('calls service.remove with id and organizationId', async () => {
      await controller.remove(OWNER, 'sup-1')
      expect(service.remove).toHaveBeenCalledWith('sup-1', 'org-1')
    })
  })
})
