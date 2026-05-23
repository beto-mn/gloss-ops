import { ConflictException, Injectable } from '@nestjs/common'

import { Prisma } from '@glossops/database'

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

  async create(data: CreateAccountData): Promise<Prisma.AccountModel> {
    try {
      return await this.prisma.account.create({ data })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({ error: 'email_already_registered' })
      }
      throw e
    }
  }
}
