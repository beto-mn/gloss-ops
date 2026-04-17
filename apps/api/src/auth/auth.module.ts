import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { envs } from '../config/envs'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { TokenService } from './token.service'
import { RedisTokenStore } from './redis-token.store'
import { AuthGuard } from './guards/auth.guard'
import { RolesGuard } from './guards/roles.guard'

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: envs.jwt.accessSecret,
      signOptions: { expiresIn: envs.jwt.accessExpiresIn as any },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    RedisTokenStore,
    AuthGuard,
    RolesGuard,
  ],
  exports: [AuthGuard, RolesGuard],
})
export class AuthModule {}
