import type { Prisma } from '@glossops/database'

export type AccountWithMemberships = Prisma.AccountGetPayload<{
  include: { memberships: { include: { branch: true } } }
}>

export interface CreateAccountData {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
}

export interface AccountRepositoryInterface {
  findByEmail(email: string): Promise<AccountWithMemberships | null>
  findByIdWithMemberships(id: string): Promise<AccountWithMemberships | null>
  create(data: CreateAccountData): Promise<Prisma.AccountModel>
}
