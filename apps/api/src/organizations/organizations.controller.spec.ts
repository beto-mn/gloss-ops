import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

jest.mock('@config', () => ({ envs: {} }))

import type { AuthContext } from '@auth/interfaces'

import { OrganizationController } from './organizations.controller'
import { OrganizationService } from './organizations.service'
import { TokenService } from '../auth/token.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('OrganizationController', () => {
  let controller: OrganizationController
  let orgService: { removeOrganization: jest.Mock }

  beforeEach(async () => {
    orgService = { removeOrganization: jest.fn().mockResolvedValue(undefined) }
    const module = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        { provide: OrganizationService, useValue: orgService },
        { provide: TokenService, useValue: {} },
      ],
    }).compile()
    controller = module.get(OrganizationController)
  })

  describe('removeOrganization', () => {
    it('calls orgService.removeOrganization with permanent=true when Owner passes ?permanent=true', () => {
      const account = makeAccount(Role.OWNER)
      void controller.removeOrganization(account, 'true')
      expect(orgService.removeOrganization).toHaveBeenCalledWith('org-1', true)
    })

    it('calls orgService.removeOrganization with permanent=false when permanent is not provided', () => {
      const account = makeAccount(Role.OWNER)
      void controller.removeOrganization(account, undefined)
      expect(orgService.removeOrganization).toHaveBeenCalledWith('org-1', false)
    })
  })
})
