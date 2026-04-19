import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'

import { Prisma, PrismaClient } from '@glossops/database'

import { envs } from '@config'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({ connectionString: envs.database.url })
    const options: Prisma.PrismaClientOptions = { adapter }
    super(options)
  }

  async onModuleInit() {
    await this.$connect()
  }
}
