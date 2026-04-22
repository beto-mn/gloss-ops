import { randomUUID } from 'crypto'

import type { Prisma } from '@glossops/database'

import type {
  AccountRepositoryInterface,
  AccountWithMemberships,
  CreateAccountData,
} from '@auth/interfaces'

export class InMemoryAccountRepository implements AccountRepositoryInterface {
  private readonly accounts: AccountWithMemberships[] = []

  seed(accounts: AccountWithMemberships[]): void {
    this.accounts.push(...accounts)
  }

  async findByEmail(email: string): Promise<AccountWithMemberships | null> {
    return this.accounts.find((a) => a.email === email) ?? null
  }

  async findByIdWithMemberships(
    id: string
  ): Promise<AccountWithMemberships | null> {
    return this.accounts.find((a) => a.id === id) ?? null
  }

  async create(data: CreateAccountData): Promise<Prisma.AccountModel> {
    const account: AccountWithMemberships = {
      id: randomUUID(),
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberships: [],
      ...data,
    }
    this.accounts.push(account)
    return account
  }
}
