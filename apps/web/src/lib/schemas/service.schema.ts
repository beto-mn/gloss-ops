import { z } from 'zod'

export interface Service {
  id: string
  name: string
  description: string | null
  basePrice: string | number
  warrantyDays: number | null
  isActive: boolean
  claveProdServ: string | null
  claveUnidad: string | null
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

export interface ServiceListParams {
  includeInactive?: boolean
  search?: string
  page?: number
  limit?: number
}

export const createServiceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().or(z.literal('')),
  basePrice: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  warrantyDays: z.coerce
    .number()
    .int()
    .min(0, 'Los días de garantía no pueden ser negativos')
    .optional(),
  claveProdServ: z
    .string()
    .max(15)
    .regex(/^[a-zA-Z0-9]*$/, 'Solo caracteres alfanuméricos')
    .optional()
    .or(z.literal('')),
  claveUnidad: z
    .string()
    .max(10)
    .regex(/^[a-zA-Z0-9]*$/, 'Solo caracteres alfanuméricos')
    .optional()
    .or(z.literal('')),
})

export const updateServiceSchema = createServiceSchema.partial()

export type CreateServiceValues = z.infer<typeof createServiceSchema>
export type UpdateServiceValues = z.infer<typeof updateServiceSchema>
