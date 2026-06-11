import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { ServicesController } from './services.controller'
import { ServicesService } from './services.service'

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

describe('ServicesController', () => {
  let controller: ServicesController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    activate: jest.Mock
    deactivate: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      activate: jest.fn().mockResolvedValue({}),
      deactivate: jest.fn().mockResolvedValue({}),
    }
    const module = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: service }],
    }).compile()
    controller = module.get(ServicesController)
  })

  describe('create', () => {
    it('calls service.create with organizationId from account', async () => {
      await controller.create(OWNER, { name: 'Ceramic Coating' } as never)
      expect(service.create).toHaveBeenCalledWith('org-1', {
        name: 'Ceramic Coating',
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
      await controller.findOne(OWNER, 'svc-1')
      expect(service.findOne).toHaveBeenCalledWith('svc-1', 'org-1')
    })
  })

  describe('update', () => {
    it('calls service.update with id and organizationId', async () => {
      await controller.update(MANAGER, 'svc-1', { name: 'Elite' } as never)
      expect(service.update).toHaveBeenCalledWith('svc-1', 'org-1', {
        name: 'Elite',
      })
    })
  })

  describe('remove (route removed)', () => {
    it('does not expose a remove handler on ServicesController', () => {
      expect(
        (controller as unknown as Record<string, unknown>).remove
      ).toBeUndefined()
    })
  })

  describe('activate', () => {
    it('calls service.activate with id and organizationId', async () => {
      await controller.activate(OWNER, 'svc-1')
      expect(service.activate).toHaveBeenCalledWith('svc-1', 'org-1')
    })
  })

  describe('deactivate', () => {
    it('calls service.deactivate with id and organizationId', async () => {
      await controller.deactivate(MANAGER, 'svc-1')
      expect(service.deactivate).toHaveBeenCalledWith('svc-1', 'org-1')
    })
  })
})
