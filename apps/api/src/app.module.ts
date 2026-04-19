import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { Module } from '@nestjs/common'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { AuthModule } from '@auth'

import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
