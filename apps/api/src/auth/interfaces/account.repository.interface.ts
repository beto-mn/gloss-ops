import type { Prisma } from '@glossops/database'

export interface CreateAccountData {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
}

export interface AccountRepositoryInterface {
  findByEmail(email: string): Promise<Prisma.AccountModel | null>
  findById(id: string): Promise<Prisma.AccountModel | null>
  create(data: CreateAccountData): Promise<Prisma.AccountModel>
}
