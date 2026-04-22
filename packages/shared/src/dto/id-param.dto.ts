import { z } from 'zod'

export const IdParamSchema = z.object({
  id: z.string().uuid(),
})

export type IdParamDto = z.infer<typeof IdParamSchema>
