import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'

import type { AuthContext } from '@auth/interfaces'

export const CurrentAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthContext }>()
    return request.user
  }
)
