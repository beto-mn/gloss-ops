export interface Warranty {
  id: string
  workOrderItemId: string
  serviceId: string
  serviceName?: string
  description: string
  term: string | null
  validFrom: string
  validUntil: string
  isVoid: boolean
  voidReason: string | null
  createdAt: string
}
