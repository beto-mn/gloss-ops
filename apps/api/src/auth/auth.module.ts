import { forwardRef, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { envs } from '@config'

import { OrganizationsModule } from '../organizations/organizations.module'
import { PrismaAccountRepository } from './infrastructure/prisma-account.repository'
import { RedisTokenStore } from './infrastructure/redis-token.store'
import { ACCOUNT_REPOSITORY, TOKEN_STORE } from './auth.tokens'
import { AuthController } from './auth.controller'
import { TokenService } from './token.service'
import { AuthService } from './auth.service'

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: envs.jwt.accessSecret,
      signOptions: { expiresIn: envs.jwt.accessExpiresInSeconds },
    }),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [AuthController],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: TOKEN_STORE, useClass: RedisTokenStore },
    TokenService,
    AuthService,
    RolesGuard,
    AuthGuard,
  ],
  exports: [AuthGuard, RolesGuard, TokenService, JwtModule, ACCOUNT_REPOSITORY],
})
export class AuthModule {}
