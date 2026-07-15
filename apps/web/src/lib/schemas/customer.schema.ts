import { z } from 'zod'

import { CreateCustomerSchema } from '@glossops/shared'

/**
 * Web customer form schema. Composes the shared `CreateCustomerSchema` field
 * shape and layers web-only UX concerns: Spanish `.min(1)` messages for the
 * required names, an `.email()` format check that the shared body schema omits,
 * and empty-string acceptance (`.or(z.literal(''))`) so RHF inputs default to
 * `''`. The submit handler maps `''` → `undefined` before hitting the API.
 * Optional-field max lengths come from the shared schema (the source of truth).
 */
export const createCustomerSchema = CreateCustomerSchema.extend({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z
    .string()
    .max(254)
    .email('Correo inválido')
    .optional()
    .or(z.literal('')),
  phone: CreateCustomerSchema.shape.phone.or(z.literal('')),
  address: CreateCustomerSchema.shape.address.or(z.literal('')),
  taxId: CreateCustomerSchema.shape.taxId.or(z.literal('')),
  fiscalRegime: CreateCustomerSchema.shape.fiscalRegime.or(z.literal('')),
  zipCode: CreateCustomerSchema.shape.zipCode.or(z.literal('')),
  source: CreateCustomerSchema.shape.source.or(z.literal('')),
  note: CreateCustomerSchema.shape.note.or(z.literal('')),
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
