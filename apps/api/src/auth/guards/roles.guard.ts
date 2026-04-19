import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  ForbiddenException,
  ExecutionContext,
  CanActivate,
  Injectable,
} from '@nestjs/common'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'
import { ROLES_KEY } from '@auth/decorators'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles?.length) return true

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user: AuthContext }>()

    if (!user?.role) {
      throw new ForbiddenException({ error: 'no_membership' })
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({ error: 'insufficient_role' })
    }

    return true
  }
}
