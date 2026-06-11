import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis'
import { execFileSync } from 'child_process'
import { randomUUID } from 'crypto'
import { resolve } from 'path'

const DATABASE_PACKAGE_DIR = resolve(__dirname, '../../../packages/database')

interface ContainerHandles {
  postgres: StartedPostgreSqlContainer
  redis: StartedRedisContainer
}

declare global {
  var __GLOSSOPS_TC__: ContainerHandles | undefined
}

export default async function globalSetup(): Promise<void> {
  let postgres: StartedPostgreSqlContainer
  let redis: StartedRedisContainer

  try {
    postgres = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('glossops_test')
      .withUsername('glossops')
      .withPassword('glossops')
      .start()
    redis = await new RedisContainer('redis:7-alpine').start()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('connect ENOENT') ||
      message.includes('Could not find a working container runtime') ||
      message.includes('Cannot connect to the Docker daemon')
    ) {
      throw new Error(
        'Docker is required to run e2e tests — please start Docker Desktop or your Docker daemon'
      )
    }
    throw err
  }

  const databaseUrl = postgres.getConnectionUri()
  const redisUrl = redis.getConnectionUrl()

  process.env.DATABASE_URL = databaseUrl
  process.env.REDIS_URL = redisUrl
  process.env.JWT_ACCESS_SECRET = randomUUID() + randomUUID()
  process.env.JWT_REFRESH_EXPIRES_IN_DAYS = '30'
  process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = '900'
  process.env.APP_FRONTEND_URL = 'http://localhost:3001'

  try {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: DATABASE_PACKAGE_DIR,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    })
  } catch (err) {
    await postgres.stop().catch(() => undefined)
    await redis.stop().catch(() => undefined)
    throw err
  }

  globalThis.__GLOSSOPS_TC__ = { postgres, redis }
}
