import { z } from 'zod'

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePrice: z.union([z.string(), z.number()]),
  isActive: z.boolean(),
  warrantyDays: z.number().nullable(),
  claveProdServ: z.string().nullable(),
  claveUnidad: z.string().nullable(),
})

export type Service = z.infer<typeof ServiceSchema>
