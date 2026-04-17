const required = (key: string): string => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

export const envs = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: required('DATABASE_URL'),
  },
  redis: {
    url: required('REDIS_URL'),
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresInDays: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? '30',
      10
    ),
  },
}
