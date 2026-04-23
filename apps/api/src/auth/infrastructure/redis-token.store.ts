import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

import type { TokenStoreInterface } from '@auth/interfaces'
import { envs } from '@config'

@Injectable()
export class RedisTokenStore implements TokenStoreInterface, OnModuleDestroy {
  private readonly client: Redis

  constructor() {
    this.client = new Redis(envs.redis.url)
  }

  async save(
    accountId: string,
    tokenId: string,
    ttlDays: number
  ): Promise<void> {
    const key = `refresh:${accountId}:${tokenId}`
    await this.client.set(key, '1', 'EX', ttlDays * 24 * 60 * 60)
  }

  async exists(accountId: string, tokenId: string): Promise<boolean> {
    const key = `refresh:${accountId}:${tokenId}`
    return (await this.client.exists(key)) === 1
  }

  async delete(accountId: string, tokenId: string): Promise<void> {
    const key = `refresh:${accountId}:${tokenId}`
    await this.client.del(key)
  }

  async onModuleDestroy() {
    await this.client.quit()
  }
}
