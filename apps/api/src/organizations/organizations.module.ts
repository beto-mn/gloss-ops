import { forwardRef, Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'
import { AuthModule } from '@auth'

import { PrismaOrganizationRepository } from './infrastructure/prisma-organization.repository'
import { RedisInvitationStore } from './infrastructure/redis-invitation.store'
import {
  INVITATION_STORE,
  ORGANIZATION_REPOSITORY,
} from './organizations.tokens'
import { OrganizationController } from './organizations.controller'
import { OrganizationService } from './organizations.service'

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [OrganizationController],
  providers: [
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: PrismaOrganizationRepository,
    },
    { provide: INVITATION_STORE, useClass: RedisInvitationStore },
    OrganizationService,
  ],
  exports: [ORGANIZATION_REPOSITORY, INVITATION_STORE],
})
export class OrganizationsModule {}
