import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@glossops/database'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { AuthContext } from './auth.guard'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles?.length) return true

    const user: AuthContext = context.switchToHttp().getRequest()['user']

    if (!user?.role) {
      throw new ForbiddenException({ error: 'no_membership' })
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({ error: 'insufficient_role' })
    }

    return true
  }
}
