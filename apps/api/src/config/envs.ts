import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ACCESS_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  INVITATION_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  APP_FRONTEND_URL: z.string().url().default('http://localhost:3001'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const env = parsed.data

export const envs = {
  port: env.PORT,
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessExpiresInSeconds: env.JWT_ACCESS_EXPIRES_IN_SECONDS,
    refreshExpiresInDays: env.JWT_REFRESH_EXPIRES_IN_DAYS,
  },
  invitation: { expiresInDays: env.INVITATION_EXPIRES_IN_DAYS },
  app: { frontendUrl: env.APP_FRONTEND_URL },
}
