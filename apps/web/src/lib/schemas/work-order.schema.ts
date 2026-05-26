export type WorkOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type WorkOrderType = 'STANDARD' | 'WARRANTY_CLAIM'

export interface WorkOrder {
  id: string
  folio: string
  status: WorkOrderStatus
  type: WorkOrderType
  createdAt: string
  completedAt: string | null
}

export interface WorkOrderPage {
  data: WorkOrder[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
