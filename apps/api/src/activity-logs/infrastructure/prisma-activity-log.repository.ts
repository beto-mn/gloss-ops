import { Injectable } from '@nestjs/common'

import { PrismaService } from '@prisma'
import type {
  ActivityLogPage,
  ActivityLogQuery,
  ActivityLogRecord,
  ActivityLogRepositoryInterface,
  CreateActivityLogData,
} from '@activity-logs/interfaces'

type PrismaActivityLogRow = Awaited<
  ReturnType<PrismaService['activityLog']['findUniqueOrThrow']>
>

@Injectable()
export class PrismaActivityLogRepository implements ActivityLogRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: PrismaActivityLogRow): ActivityLogRecord {
    return {
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      accountId: row.accountId,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt,
    }
  }

  async create(data: CreateActivityLogData): Promise<ActivityLogRecord> {
    const row = await this.prisma.activityLog.create({
      data: {
        organizationId: data.organizationId,
        branchId: data.branchId ?? null,
        accountId: data.accountId ?? null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: data.metadata ?? undefined,
      },
    })
    return this.toRecord(row)
  }

  async findAll(
    organizationId: string,
    query: ActivityLogQuery
  ): Promise<ActivityLogPage> {
    const where = {
      organizationId,
      ...(query.entity !== undefined ? { entity: query.entity } : {}),
      ...(query.entityId !== undefined ? { entityId: query.entityId } : {}),
      ...(query.action !== undefined ? { action: query.action } : {}),
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.activityLog.count({ where }),
    ])
    return {
      data: rows.map(r => this.toRecord(r)),
      total,
      page: query.page,
      limit: query.limit,
    }
  }
}
