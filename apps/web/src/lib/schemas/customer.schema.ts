import { z } from 'zod'

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  taxId: z.string().max(20).optional().or(z.literal('')),
  fiscalRegime: z.string().max(100).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
  source: z.string().max(50).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
})

export type CreateCustomerValues = z.infer<typeof createCustomerSchema>

export const updateCustomerSchema = createCustomerSchema.partial()

export type UpdateCustomerValues = z.infer<typeof updateCustomerSchema>

export interface CustomerWithCount {
  id: string
  organizationId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
  fiscalRegime: string | null
  zipCode: string | null
  source: string | null
  note: string | null
  status: string
  createdAt: string
  updatedAt: string
  activeWorkOrderCount: number
}

export interface CustomerPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CustomerPage {
  data: CustomerWithCount[]
  meta: CustomerPageMeta
}

export interface CustomerListParams {
  search?: string
  sortBy?: 'firstName' | 'lastName' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL'
  page?: number
  limit?: number
}
