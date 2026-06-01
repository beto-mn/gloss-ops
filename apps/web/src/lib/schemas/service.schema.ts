export interface Service {
  id: string
  name: string
  description: string | null
  price: number
  warrantyDays: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface ServicePage {
  data: Service[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
