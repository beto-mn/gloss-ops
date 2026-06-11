import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { StartedRedisContainer } from '@testcontainers/redis'

interface ContainerHandles {
  postgres: StartedPostgreSqlContainer
  redis: StartedRedisContainer
}

declare global {
  var __GLOSSOPS_TC__: ContainerHandles | undefined
}

export default async function globalTeardown(): Promise<void> {
  const handles = globalThis.__GLOSSOPS_TC__
  if (!handles) return

  await Promise.all([
    handles.postgres.stop().catch(() => undefined),
    handles.redis.stop().catch(() => undefined),
  ])

  globalThis.__GLOSSOPS_TC__ = undefined
}
