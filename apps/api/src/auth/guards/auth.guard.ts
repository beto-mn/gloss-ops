import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  ForbiddenException,
  UnauthorizedException,
  ExecutionContext,
  CanActivate,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { AuthContext, AccountRepositoryInterface } from '@auth/interfaces'
import { IS_PUBLIC_KEY } from '@auth/decorators'
import type { OrganizationRepositoryInterface } from '@organizations/interfaces'

import { ORGANIZATION_REPOSITORY } from '../../organizations/organizations.tokens'
import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { TokenService } from '../token.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryInterface,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepositoryInterface,
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractToken(request)
    if (!token) throw new UnauthorizedException()

    let payload: { sub: string; email: string }
    try {
      payload = await this.tokenService.verifyAccessToken(token)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ error: 'token_expired' })
      }
      throw new UnauthorizedException()
    }

    const account = await this.accounts.findById(payload.sub)
    if (!account) throw new UnauthorizedException()

    const orgId = request.headers['x-organization-id'] as string | undefined

    const user: AuthContext = {
      sub: account.id,
      email: account.email,
      memberId: null,
      branchId: null,
      organizationId: null,
      role: null,
    }

    if (orgId) {
      const member = await this.organizations.findMember(account.id, orgId)
      if (!member) throw new ForbiddenException({ error: 'not_a_member' })
      user.memberId = member.id
      user.branchId = member.branchId
      user.organizationId = orgId
      user.role = member.role
    }

    request['user'] = user
    return true
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
