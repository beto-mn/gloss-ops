import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'

import type {
  ActivityLogPage,
  ActivityLogQuery,
  ActivityLogRecord,
  ActivityLogRepositoryInterface,
  CreateActivityLogData,
} from '@activity-logs/interfaces'

@Injectable()
export class InMemoryActivityLogRepository implements ActivityLogRepositoryInterface {
  readonly store = new Map<string, ActivityLogRecord>()

  create(data: CreateActivityLogData): Promise<ActivityLogRecord> {
    const record: ActivityLogRecord = {
      id: randomUUID(),
      organizationId: data.organizationId,
      branchId: data.branchId ?? null,
      accountId: data.accountId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    }
    this.store.set(record.id, record)
    return Promise.resolve(record)
  }

  findAll(
    organizationId: string,
    query: ActivityLogQuery
  ): Promise<ActivityLogPage> {
    let results = Array.from(this.store.values()).filter(
      r => r.organizationId === organizationId
    )
    if (query.entity !== undefined) {
      results = results.filter(r => r.entity === query.entity)
    }
    if (query.entityId !== undefined) {
      results = results.filter(r => r.entityId === query.entityId)
    }
    if (query.action !== undefined) {
      results = results.filter(r => r.action === query.action)
    }
    const total = results.length
    const { page, limit } = query
    const data = results.slice((page - 1) * limit, page * limit)
    return Promise.resolve({ data, total, page, limit })
  }
}
