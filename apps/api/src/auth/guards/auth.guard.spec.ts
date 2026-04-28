import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import {
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common'

import type { AuthContext } from '@auth/interfaces'

import { InMemoryOrganizationRepository } from '../../organizations/infrastructure/in-memory-organization.repository'
import { ORGANIZATION_REPOSITORY } from '../../organizations/organizations.tokens'
import { InMemoryAccountRepository } from '../infrastructure/in-memory-account.repository'
import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { TokenService } from '../token.service'
import { AuthGuard } from './auth.guard'

jest.mock('@glossops/database', () => ({
  Role: {
    OWNER: 'OWNER',
    MANAGER: 'MANAGER',
    TECHNICIAN: 'TECHNICIAN',
    FRONT_DESK: 'FRONT_DESK',
  },
  ResourceStatus: {
    ACTIVE: 'ACTIVE',
    DELETED: 'DELETED',
  },
}))

jest.mock('@config', () => ({
  envs: { jwt: { accessSecret: 'test-secret' } },
}))

type TestCtx = ExecutionContext & {
  _request: {
    headers: { authorization?: string; 'x-organization-id'?: string }
    user?: AuthContext
  }
}

const makeCtx = (authHeader?: string, orgId?: string): TestCtx => {
  const request = {
    headers: { authorization: authHeader, 'x-organization-id': orgId },
    user: undefined as AuthContext | undefined,
  }
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
    _request: request,
  } as unknown as TestCtx
}

const mockAccount = {
  id: 'acc-uuid',
  email: 'test@example.com',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('AuthGuard', () => {
  let guard: AuthGuard
  let accounts: InMemoryAccountRepository
  let organizations: InMemoryOrganizationRepository
  let tokenService: jest.Mocked<TokenService>
  let reflector: jest.Mocked<Reflector>

  beforeEach(async () => {
    accounts = new InMemoryAccountRepository()
    accounts.seed([mockAccount])
    organizations = new InMemoryOrganizationRepository()

    const module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
        { provide: ORGANIZATION_REPOSITORY, useValue: organizations },
        {
          provide: TokenService,
          useValue: {
            verifyAccessToken: jest.fn().mockResolvedValue({
              sub: 'acc-uuid',
              email: 'test@example.com',
            }),
          },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile()

    guard = module.get(AuthGuard)
    tokenService = module.get(TokenService)
    reflector = module.get(Reflector)
  })

  it('allows public routes without any token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    expect(await guard.canActivate(makeCtx())).toBe(true)
  })

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    await expect(guard.canActivate(makeCtx())).rejects.toThrow(
      UnauthorizedException
    )
  })

  it('throws UnauthorizedException when token verification fails', async () => {
    tokenService.verifyAccessToken.mockRejectedValueOnce(new Error('expired'))
    await expect(
      guard.canActivate(makeCtx('Bearer bad.token'))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('throws UnauthorizedException when account not found', async () => {
    tokenService.verifyAccessToken.mockResolvedValueOnce({
      sub: 'nonexistent-id',
      email: 'x@x.com',
    })
    await expect(
      guard.canActivate(makeCtx('Bearer valid.token'))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('attaches AuthContext with null org fields when no X-Organization-Id header', async () => {
    const ctx = makeCtx('Bearer valid.token')
    await guard.canActivate(ctx)
    expect(ctx._request.user).toEqual({
      sub: 'acc-uuid',
      email: 'test@example.com',
      memberId: null,
      branchId: null,
      organizationId: null,
      role: null,
    })
  })

  it('throws ForbiddenException when account is not a member of the given org', async () => {
    await expect(
      guard.canActivate(makeCtx('Bearer valid.token', 'unknown-org-id'))
    ).rejects.toThrow(ForbiddenException)
  })

  it('attaches full AuthContext when account is a valid member of the org', async () => {
    const { organization } = await organizations.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-uuid'
    )
    const ctx = makeCtx('Bearer valid.token', organization.id)
    await guard.canActivate(ctx)
    expect(ctx._request.user).toMatchObject({
      sub: 'acc-uuid',
      email: 'test@example.com',
      organizationId: organization.id,
      role: 'OWNER',
    })
    expect(ctx._request.user?.memberId).toBeDefined()
    expect(ctx._request.user?.branchId).toBeDefined()
  })
})
