import { Injectable, Inject } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import type { BranchRepositoryInterface } from '@branches/interfaces'

import { BRANCH_REPOSITORY } from './branches.tokens'

const RETENTION_DAYS = 30

@Injectable()
export class BranchCleanupService {
  constructor(
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepositoryInterface
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup(): Promise<void> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
    const expired = await this.branches.findExpiredDeleted(cutoff)
    for (const branch of expired) {
      await this.branches.hardDelete(branch.id)
    }
  }
}
