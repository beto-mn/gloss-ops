import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

import { envs } from '@config'
import type {
  InvitationStoreInterface,
  InvitationPayload,
} from '@organizations/interfaces'

@Injectable()
export class RedisInvitationStore
  implements InvitationStoreInterface, OnModuleDestroy
{
  private readonly client: Redis

  constructor() {
    this.client = new Redis(envs.redis.url)
  }

  async save(
    token: string,
    payload: InvitationPayload,
    ttlDays: number
  ): Promise<void> {
    const key = `invitation:${token}`
    await this.client.set(
      key,
      JSON.stringify(payload),
      'EX',
      ttlDays * 24 * 60 * 60
    )
  }

  async get(token: string): Promise<InvitationPayload | null> {
    const key = `invitation:${token}`
    const value = await this.client.get(key)
    if (!value) return null
    return JSON.parse(value) as InvitationPayload
  }

  async delete(token: string): Promise<void> {
    await this.client.del(`invitation:${token}`)
  }

  async onModuleDestroy() {
    await this.client.quit()
  }
}
