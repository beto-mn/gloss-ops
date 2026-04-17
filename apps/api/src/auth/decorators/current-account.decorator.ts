import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthContext } from '../guards/auth.guard'

export const CurrentAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest()
    return request['user']
  }
)
