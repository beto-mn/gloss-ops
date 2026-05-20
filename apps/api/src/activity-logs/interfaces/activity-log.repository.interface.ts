import type { ActivityAction } from '@glossops/database'

export interface ActivityLogRecord {
  id: string
  organizationId: string
  branchId: string | null
  accountId: string | null
  action: ActivityAction
  entity: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface CreateActivityLogData {
  organizationId: string
  branchId?: string
  accountId?: string
  action: ActivityAction
  entity: string
  entityId: string
  metadata?: Record<string, unknown>
}

export interface ActivityLogQuery {
  entity?: string
  entityId?: string
  action?: ActivityAction
  page: number
  limit: number
}

export interface ActivityLogPage {
  data: ActivityLogRecord[]
  total: number
  page: number
  limit: number
}

export interface ActivityLogRepositoryInterface {
  create(data: CreateActivityLogData): Promise<ActivityLogRecord>
  findAll(
    organizationId: string,
    query: ActivityLogQuery
  ): Promise<ActivityLogPage>
}
