import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  UnauthorizedException,
  ExecutionContext,
  CanActivate,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { AuthContext, AccountRepositoryInterface } from '@auth/interfaces'
import { IS_PUBLIC_KEY } from '@auth/decorators'

import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { TokenService } from '../token.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryInterface,
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

    let payload: { sub: string; memberId: string | null }
    try {
      payload = await this.tokenService.verifyAccessToken(token)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ error: 'token_expired' })
      }
      throw new UnauthorizedException()
    }

    const account = await this.accounts.findByIdWithMemberships(payload.sub)
    if (!account) throw new UnauthorizedException()

    const membership = account.memberships[0] ?? null

    const user: AuthContext = {
      sub: account.id,
      memberId: membership?.id ?? null,
      email: account.email,
      branchId: membership?.branchId ?? null,
      organizationId: membership?.branch?.organizationId ?? null,
      role: membership?.role ?? null,
    }

    request['user'] = user
    return true
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
