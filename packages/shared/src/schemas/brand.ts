import { z } from 'zod'

import { AssetType } from '../enums'

export const BrandSchema = z.object({
  id: z.string(),
  organizationId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  category: z.nativeEnum(AssetType),
  isSeeded: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Brand = z.infer<typeof BrandSchema>
