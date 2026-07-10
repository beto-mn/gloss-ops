import { z } from 'zod'

import { CreateServiceSchema } from '@glossops/shared'

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

/**
 * Web service form schema. Composes the shared `CreateServiceSchema` field
 * shape and layers web-only UX concerns: Spanish messages, `z.coerce.number()`
 * on the numeric inputs (the `type=number` inputs return strings that RHF must
 * coerce for the form), and empty-string acceptance for the optional string
 * inputs. The shared `warrantyDescription`/`warrantyTerm` fields are not
 * collected by this form and are omitted. The clave regex is relaxed to allow
 * the empty input (`*` vs the shared `+`) since blank values are cleaned to
 * `undefined` before submit.
 */
export const createServiceSchema = CreateServiceSchema.omit({
  basePrice: true,
  warrantyDays: true,
  warrantyDescription: true,
  warrantyTerm: true,
  claveProdServ: true,
  claveUnidad: true,
}).extend({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
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
