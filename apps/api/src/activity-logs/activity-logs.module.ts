import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaActivityLogRepository } from './infrastructure/prisma-activity-log.repository'
import { ActivityLogsController } from './activity-logs.controller'
import { ACTIVITY_LOG_REPOSITORY } from './activity-logs.tokens'
import { ActivityLogsService } from './activity-logs.service'

@Module({
  imports: [PrismaModule],
  controllers: [ActivityLogsController],
  providers: [
    {
      provide: ACTIVITY_LOG_REPOSITORY,
      useClass: PrismaActivityLogRepository,
    },
    ActivityLogsService,
  ],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
