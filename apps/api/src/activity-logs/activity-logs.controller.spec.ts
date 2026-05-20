import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { ActivityLogsController } from './activity-logs.controller'
import { ActivityLogsService } from './activity-logs.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)

describe('ActivityLogsController', () => {
  let controller: ActivityLogsController
  let service: { findAll: jest.Mock }

  beforeEach(async () => {
    service = {
      findAll: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    }
    const module = await Test.createTestingModule({
      controllers: [ActivityLogsController],
      providers: [{ provide: ActivityLogsService, useValue: service }],
    }).compile()
    controller = module.get(ActivityLogsController)
  })

  describe('findAll', () => {
    it('calls service.findAll with organizationId and dto', async () => {
      const dto = { entity: 'WorkOrder' }
      await controller.findAll(OWNER, dto as never)
      expect(service.findAll).toHaveBeenCalledWith('org-1', dto)
    })
  })
})
