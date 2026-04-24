import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  AccountRepositoryInterface,
  CreateAccountData,
} from '@auth/interfaces'
import { PrismaService } from '@prisma'

@Injectable()
export class PrismaAccountRepository implements AccountRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<Prisma.AccountModel | null> {
    return this.prisma.account.findUnique({ where: { email } })
  }

  findById(id: string): Promise<Prisma.AccountModel | null> {
    return this.prisma.account.findUnique({ where: { id } })
  }

  create(data: CreateAccountData): Promise<Prisma.AccountModel> {
    return this.prisma.account.create({ data })
  }
}
