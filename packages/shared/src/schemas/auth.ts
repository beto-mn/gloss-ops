import { z } from 'zod'

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
})

export type AuthTokens = z.infer<typeof AuthTokensSchema>
