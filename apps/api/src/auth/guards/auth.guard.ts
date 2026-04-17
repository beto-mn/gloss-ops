import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { Role } from '@glossops/database'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { TokenService } from '../token.service'
import { PrismaService } from '../../prisma/prisma.service'

export interface AuthContext {
  sub: string
  memberId: string | null
  email: string
  branchId: string | null
  organizationId: string | null
  role: Role | null
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
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
    } catch (e: any) {
      if (e?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ error: 'token_expired' })
      }
      throw new UnauthorizedException()
    }

    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
      include: { memberships: { include: { branch: true } } },
    })
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
