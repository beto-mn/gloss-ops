import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@glossops/database'
import { envs } from '../config/envs'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({ connectionString: envs.database.url })
    super({ adapter } as any)
  }

  async onModuleInit() {
    await this.$connect()
  }
}
