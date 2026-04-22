import { UnauthorizedException, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'

import type { AuthContext, AccountWithMemberships } from '@auth/interfaces'

import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { InMemoryAccountRepository } from '../infrastructure/in-memory-account.repository'
import { TokenService } from '../token.service'
import { AuthGuard } from './auth.guard'

jest.mock('@glossops/database', () => ({
  Role: {
    OWNER: 'OWNER',
    MANAGER: 'MANAGER',
    TECHNICIAN: 'TECHNICIAN',
    FRONT_DESK: 'FRONT_DESK',
  },
}))

jest.mock('@config', () => ({
  envs: { jwt: { accessSecret: 'test-secret' } },
}))

type TestCtx = ExecutionContext & {
  _request: { headers: { authorization?: string }; user?: AuthContext }
}

const makeCtx = (authHeader?: string): TestCtx => {
  const request = {
    headers: { authorization: authHeader },
    user: undefined as AuthContext | undefined,
  }
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
    _request: request,
  } as unknown as TestCtx
}

const mockAccount: AccountWithMemberships = {
  id: 'acc-uuid',
  email: 'test@example.com',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: 'mem-uuid',
      branchId: 'branch-uuid',
      accountId: 'acc-uuid',
      role: 'OWNER' as never,
      joinedAt: new Date(),
      branch: {
        id: 'branch-uuid',
        organizationId: 'org-uuid',
        name: 'Main',
        address: null,
        phone: null,
        email: null,
        isMain: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
}

describe('AuthGuard', () => {
  let guard: AuthGuard
  let accounts: InMemoryAccountRepository
  let tokenService: jest.Mocked<TokenService>
  let reflector: jest.Mocked<Reflector>

  beforeEach(async () => {
    accounts = new InMemoryAccountRepository()
    accounts.seed([mockAccount])

    const module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
        {
          provide: TokenService,
          useValue: {
            verifyAccessToken: jest
              .fn()
              .mockResolvedValue({ sub: 'acc-uuid', memberId: 'mem-uuid' }),
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
      memberId: null,
    })
    await expect(
      guard.canActivate(makeCtx('Bearer valid.token'))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('attaches full AuthContext to request.user on valid token', async () => {
    const ctx = makeCtx('Bearer valid.token')
    await guard.canActivate(ctx)
    expect(ctx._request.user).toEqual({
      sub: 'acc-uuid',
      memberId: 'mem-uuid',
      email: 'test@example.com',
      branchId: 'branch-uuid',
      organizationId: 'org-uuid',
      role: 'OWNER',
    })
  })

  it('sets membership fields to null when account has no membership', async () => {
    accounts.seed([{ ...mockAccount, id: 'no-member-id', memberships: [] }])
    tokenService.verifyAccessToken.mockResolvedValueOnce({
      sub: 'no-member-id',
      memberId: null,
    })
    const ctx = makeCtx('Bearer valid.token')
    await guard.canActivate(ctx)
    expect(ctx._request.user).toMatchObject({
      memberId: null,
      branchId: null,
      organizationId: null,
      role: null,
    })
  })
})
