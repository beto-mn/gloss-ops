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

  findByEmail(email: string): Promise<AccountWithMemberships | null> {
    return Promise.resolve(this.accounts.find((a) => a.email === email) ?? null)
  }

  findByIdWithMemberships(id: string): Promise<AccountWithMemberships | null> {
    return Promise.resolve(this.accounts.find((a) => a.id === id) ?? null)
  }

  create(data: CreateAccountData): Promise<Prisma.AccountModel> {
    const account: AccountWithMemberships = {
      id: randomUUID(),
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberships: [],
      ...data,
    }
    this.accounts.push(account)
    return Promise.resolve(account)
  }
}
