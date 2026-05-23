import { randomUUID } from 'crypto'

import { ConflictException } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  AccountRepositoryInterface,
  CreateAccountData,
} from '@auth/interfaces'

export class InMemoryAccountRepository implements AccountRepositoryInterface {
  private readonly accounts: Prisma.AccountModel[] = []

  seed(accounts: Prisma.AccountModel[]): void {
    this.accounts.push(...accounts)
  }

  findByEmail(email: string): Promise<Prisma.AccountModel | null> {
    return Promise.resolve(this.accounts.find(a => a.email === email) ?? null)
  }

  findById(id: string): Promise<Prisma.AccountModel | null> {
    return Promise.resolve(this.accounts.find(a => a.id === id) ?? null)
  }

  create(data: CreateAccountData): Promise<Prisma.AccountModel> {
    if (this.accounts.some(a => a.email === data.email)) {
      return Promise.reject(
        new ConflictException({ error: 'email_already_registered' })
      )
    }
    const account: Prisma.AccountModel = {
      id: randomUUID(),
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }
    this.accounts.push(account)
    return Promise.resolve(account)
  }
}
