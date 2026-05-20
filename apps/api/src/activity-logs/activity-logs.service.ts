import { Inject, Injectable } from '@nestjs/common'

import { ACTIVITY_LOG_REPOSITORY } from './activity-logs.tokens'
import type { ListActivityLogsDto } from './dto'
import type {
  ActivityLogPage,
  ActivityLogRepositoryInterface,
  CreateActivityLogData,
} from './interfaces'

@Injectable()
export class ActivityLogsService {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly repo: ActivityLogRepositoryInterface
  ) {}

  async record(data: CreateActivityLogData): Promise<void> {
    await this.repo.create(data)
  }

  findAll(
    organizationId: string,
    dto: ListActivityLogsDto
  ): Promise<ActivityLogPage> {
    return this.repo.findAll(organizationId, {
      entity: dto.entity,
      entityId: dto.entityId,
      action: dto.action,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }
}
