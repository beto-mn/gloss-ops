import { Controller, Get, Query } from '@nestjs/common'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { ListActivityLogsDto } from './dto'
import { ActivityLogsService } from './activity-logs.service'

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListActivityLogsDto
  ) {
    return this.service.findAll(account.organizationId!, dto)
  }
}
