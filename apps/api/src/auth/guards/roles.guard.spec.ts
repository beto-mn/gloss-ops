import { Test } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { ForbiddenException } from '@nestjs/common'
import { RolesGuard } from './roles.guard'

jest.mock('@glossops/database', () => ({
  PrismaClient: class {},
  Role: {
    OWNER: 'OWNER',
    MANAGER: 'MANAGER',
    TECHNICIAN: 'TECHNICIAN',
    FRONT_DESK: 'FRONT_DESK',
  },
}))

const makeCtx = (role: string | null, requiredRoles: string[] | undefined) => {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    _requiredRoles: requiredRoles,
  }
}

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: jest.Mocked<Reflector>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile()
    guard = module.get(RolesGuard)
    reflector = module.get(Reflector)
  })

  it('allows any role when no @Roles metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)
    expect(guard.canActivate(makeCtx('TECHNICIAN', undefined) as any)).toBe(
      true
    )
  })

  it('allows user with matching role', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER', 'MANAGER'])
    expect(
      guard.canActivate(makeCtx('MANAGER', ['OWNER', 'MANAGER']) as any)
    ).toBe(true)
  })

  it('throws ForbiddenException with no_membership when role is null', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER'])
    expect(() => guard.canActivate(makeCtx(null, ['OWNER']) as any)).toThrow(
      ForbiddenException
    )
    try {
      guard.canActivate(makeCtx(null, ['OWNER']) as any)
    } catch (e: any) {
      expect(e.response).toMatchObject({ error: 'no_membership' })
    }
  })

  it('throws ForbiddenException with insufficient_role when role does not match', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER'])
    expect(() =>
      guard.canActivate(makeCtx('TECHNICIAN', ['OWNER']) as any)
    ).toThrow(ForbiddenException)
    try {
      guard.canActivate(makeCtx('TECHNICIAN', ['OWNER']) as any)
    } catch (e: any) {
      expect(e.response).toMatchObject({ error: 'insufficient_role' })
    }
  })
})
