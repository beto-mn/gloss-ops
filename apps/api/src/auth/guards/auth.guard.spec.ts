import { Test } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from './auth.guard'
import { TokenService } from '../token.service'

jest.mock('@glossops/database', () => ({
  PrismaClient: class {},
  Role: { OWNER: 'OWNER', MANAGER: 'MANAGER', TECHNICIAN: 'TECHNICIAN', FRONT_DESK: 'FRONT_DESK' },
}))
import { PrismaService } from '../../prisma/prisma.service'

jest.mock('../../config/envs', () => ({
  envs: { jwt: { accessSecret: 'test-secret' } },
}))

const makeCtx = (authHeader?: string, isPublic = false) => {
  const request = { headers: { authorization: authHeader }, user: undefined }
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
    _request: request,
    _isPublic: isPublic,
  }
}

const mockAccount = {
  id: 'acc-uuid',
  email: 'test@example.com',
  memberships: [
    {
      id: 'mem-uuid',
      branchId: 'branch-uuid',
      role: 'OWNER',
      branch: { organizationId: 'org-uuid' },
    },
  ],
}

describe('AuthGuard', () => {
  let guard: AuthGuard
  let tokenService: jest.Mocked<TokenService>
  let prisma: { account: { findUnique: jest.Mock } }
  let reflector: jest.Mocked<Reflector>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: TokenService,
          useValue: {
            verifyAccessToken: jest
              .fn()
              .mockResolvedValue({ sub: 'acc-uuid', memberId: 'mem-uuid' }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            account: { findUnique: jest.fn().mockResolvedValue(mockAccount) },
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
    prisma = module.get(PrismaService)
    reflector = module.get(Reflector)
  })

  it('allows public routes without any token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    expect(await guard.canActivate(makeCtx() as any)).toBe(true)
  })

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    await expect(guard.canActivate(makeCtx() as any)).rejects.toThrow(
      UnauthorizedException
    )
  })

  it('throws UnauthorizedException when token verification fails', async () => {
    tokenService.verifyAccessToken.mockRejectedValueOnce(new Error('expired'))
    await expect(
      guard.canActivate(makeCtx('Bearer bad.token') as any)
    ).rejects.toThrow(UnauthorizedException)
  })

  it('throws UnauthorizedException when account not found in DB', async () => {
    prisma.account.findUnique.mockResolvedValueOnce(null)
    await expect(
      guard.canActivate(makeCtx('Bearer valid.token') as any)
    ).rejects.toThrow(UnauthorizedException)
  })

  it('attaches full AuthContext to request.user on valid token', async () => {
    const ctx = makeCtx('Bearer valid.token') as any
    await guard.canActivate(ctx)
    expect(ctx._request['user']).toEqual({
      sub: 'acc-uuid',
      memberId: 'mem-uuid',
      email: 'test@example.com',
      branchId: 'branch-uuid',
      organizationId: 'org-uuid',
      role: 'OWNER',
    })
  })

  it('sets membership fields to null when account has no membership', async () => {
    prisma.account.findUnique.mockResolvedValueOnce({
      ...mockAccount,
      memberships: [],
    })
    const ctx = makeCtx('Bearer valid.token') as any
    await guard.canActivate(ctx)
    expect(ctx._request['user']).toMatchObject({
      memberId: null,
      branchId: null,
      organizationId: null,
      role: null,
    })
  })
})
