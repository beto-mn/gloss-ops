import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  AccountRepositoryInterface,
  AccountWithMemberships,
  CreateAccountData,
} from '@auth/interfaces'
import { PrismaService } from '@prisma'

@Injectable()
export class PrismaAccountRepository implements AccountRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AccountWithMemberships | null> {
    return this.prisma.account.findUnique({
      where: { email },
      include: { memberships: { include: { branch: true } } },
    })
  }

  async findByIdWithMemberships(
    id: string
  ): Promise<AccountWithMemberships | null> {
    return this.prisma.account.findUnique({
      where: { id },
      include: { memberships: { include: { branch: true } } },
    })
  }

  async create(data: CreateAccountData): Promise<Prisma.AccountModel> {
    return this.prisma.account.create({ data })
  }
}
