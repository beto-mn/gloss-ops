import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { envs } from '@config'

import { RedisTokenStore } from './redis-token.store'
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
  ],
  controllers: [AuthController],
  providers: [
    RedisTokenStore,
    TokenService,
    AuthService,
    RolesGuard,
    AuthGuard,
  ],
  exports: [AuthGuard, RolesGuard, TokenService, RedisTokenStore, JwtModule],
})
export class AuthModule {}
