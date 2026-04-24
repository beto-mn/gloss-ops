# Organizations Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-org support — simplify the JWT to `{ sub, email }`, resolve org context from `X-Organization-Id` header in `AuthGuard`, and build the `OrganizationsModule` with CRUD, member listing, and Redis-backed single-use invitations.

**Architecture:** `AuthModule` and `OrganizationsModule` use `forwardRef` to handle mutual dependencies. `AuthModule` exports `TokenService` and `ACCOUNT_REPOSITORY`; `OrganizationsModule` exports `ORGANIZATION_REPOSITORY` and `INVITATION_STORE`. All unit tests use in-memory implementations — no Prisma or Redis mocks.

**Tech Stack:** NestJS 11, Prisma 7 (`@glossops/database`), ioredis 5, class-validator, bcrypt, Jest 30

**Spec:** `docs/superpowers/specs/2026-04-23-organizations-design.md`

---

## File Map

### Modified

| File                                                                    | Change                                                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/api/package.json`                                                 | Add `@organizations/*` to `jest.moduleNameMapper`                                  |
| `apps/api/tsconfig.paths.json`                                          | Add `@organizations/*` path aliases                                                |
| `apps/api/src/config/envs.ts`                                           | Add `INVITATION_EXPIRES_IN_DAYS`, `APP_FRONTEND_URL`                               |
| `apps/api/src/auth/interfaces/jwt-payload.interface.ts`                 | Replace `memberId` with `email`                                                    |
| `apps/api/src/auth/interfaces/account.repository.interface.ts`          | Remove `AccountWithMemberships`, replace `findByIdWithMemberships` with `findById` |
| `apps/api/src/auth/interfaces/index.ts`                                 | Remove `AccountWithMemberships` export                                             |
| `apps/api/src/auth/token.service.ts`                                    | `issueTokens(accountId, email)`, `rotateTokens(accountId, tokenId, email)`         |
| `apps/api/src/auth/token.service.spec.ts`                               | Update for new signature                                                           |
| `apps/api/src/auth/auth.service.ts`                                     | `register` calls `OrganizationRepository`; `login`/`refresh` simplified            |
| `apps/api/src/auth/auth.service.spec.ts`                                | Update for new behavior                                                            |
| `apps/api/src/auth/dto/register.dto.ts`                                 | Add `organizationName`, `organizationSlug`                                         |
| `apps/api/src/auth/guards/auth.guard.ts`                                | Add `X-Organization-Id` header + `OrganizationRepository.findMember`               |
| `apps/api/src/auth/guards/auth.guard.spec.ts`                           | Full rewrite                                                                       |
| `apps/api/src/auth/auth.module.ts`                                      | `forwardRef(OrganizationsModule)`, export `ACCOUNT_REPOSITORY`                     |
| `apps/api/src/auth/infrastructure/in-memory-account.repository.ts`      | Remove memberships, replace `findByIdWithMemberships` with `findById`              |
| `apps/api/src/auth/infrastructure/in-memory-account.repository.spec.ts` | Update for simplified interface                                                    |
| `apps/api/src/auth/infrastructure/prisma-account.repository.ts`         | Replace `findByIdWithMemberships` with `findById`, simplify `findByEmail`          |
| `apps/api/src/app.module.ts`                                            | Import `OrganizationsModule`                                                       |

### Created

| File                                                                                  | Purpose                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `apps/api/src/organizations/interfaces/organization.repository.interface.ts`          | Repository contract + supporting types      |
| `apps/api/src/organizations/interfaces/invitation.store.interface.ts`                 | Redis invitation store contract             |
| `apps/api/src/organizations/interfaces/index.ts`                                      | Barrel                                      |
| `apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts`      | In-memory impl for tests                    |
| `apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts` | Tests                                       |
| `apps/api/src/organizations/infrastructure/in-memory-invitation.store.ts`             | In-memory impl for tests                    |
| `apps/api/src/organizations/infrastructure/in-memory-invitation.store.spec.ts`        | Tests                                       |
| `apps/api/src/organizations/infrastructure/prisma-organization.repository.ts`         | Prisma production impl                      |
| `apps/api/src/organizations/infrastructure/redis-invitation.store.ts`                 | Redis production impl                       |
| `apps/api/src/organizations/dto/update-org.dto.ts`                                    | PATCH /organizations/me body                |
| `apps/api/src/organizations/dto/create-invitation.dto.ts`                             | POST /organizations/invitations body        |
| `apps/api/src/organizations/dto/accept-invitation.dto.ts`                             | POST /organizations/invitations/accept body |
| `apps/api/src/organizations/dto/index.ts`                                             | Barrel                                      |
| `apps/api/src/organizations/organizations.tokens.ts`                                  | DI symbols                                  |
| `apps/api/src/organizations/organizations.module.ts`                                  | NestJS module wiring                        |
| `apps/api/src/organizations/organizations.service.ts`                                 | Business logic                              |
| `apps/api/src/organizations/organizations.service.spec.ts`                            | Unit tests                                  |
| `apps/api/src/organizations/organizations.controller.ts`                              | HTTP endpoints                              |
| `apps/api/src/organizations/index.ts`                                                 | Barrel                                      |

---

## Task 1: Config — env vars and path aliases

**Files:**

- Modify: `apps/api/src/config/envs.ts`
- Modify: `apps/api/tsconfig.paths.json`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add env vars to `envs.ts`**

```ts
// apps/api/src/config/envs.ts
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ACCESS_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  INVITATION_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  APP_FRONTEND_URL: z.string().url().default('http://localhost:3001'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const env = parsed.data

export const envs = {
  port: env.PORT,
  database: { url: env.DATABASE_URL },
  redis: { url: env.REDIS_URL },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessExpiresInSeconds: env.JWT_ACCESS_EXPIRES_IN_SECONDS,
    refreshExpiresInDays: env.JWT_REFRESH_EXPIRES_IN_DAYS,
  },
  invitation: { expiresInDays: env.INVITATION_EXPIRES_IN_DAYS },
  app: { frontendUrl: env.APP_FRONTEND_URL },
}
```

- [ ] **Step 2: Add path aliases to `tsconfig.paths.json`**

```json
{
  "compilerOptions": {
    "paths": {
      "@auth": ["./src/auth/index.ts"],
      "@auth/decorators": ["./src/auth/decorators/index.ts"],
      "@auth/dto": ["./src/auth/dto/index.ts"],
      "@auth/guards": ["./src/auth/guards/index.ts"],
      "@auth/interfaces": ["./src/auth/interfaces/index.ts"],
      "@config": ["./src/config/index.ts"],
      "@organizations": ["./src/organizations/index.ts"],
      "@organizations/dto": ["./src/organizations/dto/index.ts"],
      "@organizations/interfaces": ["./src/organizations/interfaces/index.ts"],
      "@prisma": ["./src/prisma/index.ts"]
    }
  }
}
```

- [ ] **Step 3: Add Jest module name mapper entries to `package.json`**

In the `jest.moduleNameMapper` object inside `package.json`, add:

```json
"^@organizations$": "<rootDir>/organizations/index.ts",
"^@organizations/dto$": "<rootDir>/organizations/dto/index.ts",
"^@organizations/interfaces$": "<rootDir>/organizations/interfaces/index.ts"
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/config/envs.ts apps/api/tsconfig.paths.json apps/api/package.json
git commit -m "feat(config): add invitation env vars and organizations path aliases"
```

---

## Task 2: Simplify JWT payload and TokenService

**Files:**

- Modify: `apps/api/src/auth/interfaces/jwt-payload.interface.ts`
- Modify: `apps/api/src/auth/token.service.ts`
- Modify: `apps/api/src/auth/token.service.spec.ts`

- [ ] **Step 1: Update `token.service.spec.ts` — write failing tests**

Replace the full file:

```ts
// apps/api/src/auth/token.service.spec.ts
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'

import { TOKEN_STORE } from './auth.tokens'
import { InMemoryTokenStore } from './infrastructure/in-memory-token.store'
import { TokenService } from './token.service'

jest.mock('@config', () => ({
  envs: { jwt: { refreshExpiresInDays: 30, accessExpiresInSeconds: 900 } },
}))

describe('TokenService', () => {
  let tokenService: TokenService
  let tokenStore: InMemoryTokenStore
  let jwtService: jest.Mocked<JwtService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
            verifyAsync: jest
              .fn()
              .mockResolvedValue({ sub: 'acc-1', email: 'a@b.com' }),
          },
        },
        { provide: TOKEN_STORE, useClass: InMemoryTokenStore },
      ],
    }).compile()

    tokenService = module.get(TokenService)
    tokenStore = module.get(TOKEN_STORE)
    jwtService = module.get(JwtService)
  })

  describe('issueTokens', () => {
    it('signs access token with sub and email', async () => {
      await tokenService.issueTokens('acc-1', 'a@b.com')
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'acc-1',
        email: 'a@b.com',
      })
    })

    it('saves refresh token to store', async () => {
      const result = await tokenService.issueTokens('acc-1', 'a@b.com')
      const tokenId = result.refreshToken.slice('acc-1:'.length)
      expect(await tokenStore.exists('acc-1', tokenId)).toBe(true)
    })

    it('returns accessToken, refreshToken with accountId prefix, and expiresIn 900', async () => {
      const result = await tokenService.issueTokens('acc-1', 'a@b.com')
      expect(result).toMatchObject({
        accessToken: 'signed.jwt.token',
        refreshToken: expect.stringMatching(/^acc-1:/),
        expiresIn: 900,
      })
    })
  })

  describe('rotateTokens', () => {
    it('revokes old token and issues new one', async () => {
      const first = await tokenService.issueTokens('acc-1', 'a@b.com')
      const oldTokenId = first.refreshToken.slice('acc-1:'.length)

      await tokenService.rotateTokens('acc-1', oldTokenId, 'a@b.com')

      expect(await tokenStore.exists('acc-1', oldTokenId)).toBe(false)
    })
  })

  describe('parseRefreshToken', () => {
    it('parses valid token into accountId and tokenId', () => {
      const result = tokenService.parseRefreshToken('some-uuid:another-uuid')
      expect(result).toEqual({
        accountId: 'some-uuid',
        tokenId: 'another-uuid',
      })
    })

    it('returns null for string without colon separator', () => {
      expect(tokenService.parseRefreshToken('invalid-token')).toBeNull()
    })
  })

  describe('verifyAccessToken', () => {
    it('delegates to JwtService and returns payload', async () => {
      const result = await tokenService.verifyAccessToken('some.jwt')
      expect(result).toEqual({ sub: 'acc-1', email: 'a@b.com' })
    })
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
pnpm --filter api test -- --testPathPattern="token.service.spec"
```

Expected: FAIL — `issueTokens` called with wrong args.

- [ ] **Step 3: Update `jwt-payload.interface.ts`**

```ts
// apps/api/src/auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string
  email: string
}
```

- [ ] **Step 4: Update `token.service.ts`**

```ts
// apps/api/src/auth/token.service.ts
import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'crypto'

import type {
  JwtPayload,
  TokenPair,
  TokenStoreInterface,
} from '@auth/interfaces'
import { envs } from '@config'

import { TOKEN_STORE } from './auth.tokens'

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(TOKEN_STORE) private readonly tokenStore: TokenStoreInterface
  ) {}

  async issueTokens(accountId: string, email: string): Promise<TokenPair> {
    const payload: JwtPayload = { sub: accountId, email }
    const accessToken = await this.jwtService.signAsync(payload)
    const tokenId = randomUUID()
    await this.tokenStore.save(
      accountId,
      tokenId,
      envs.jwt.refreshExpiresInDays
    )
    return {
      accessToken,
      refreshToken: `${accountId}:${tokenId}`,
      expiresIn: envs.jwt.accessExpiresInSeconds,
    }
  }

  async rotateTokens(
    accountId: string,
    tokenId: string,
    email: string
  ): Promise<TokenPair> {
    await this.tokenStore.delete(accountId, tokenId)
    return this.issueTokens(accountId, email)
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: envs.jwt.accessSecret,
    })
  }

  parseRefreshToken(
    refreshToken: string
  ): { accountId: string; tokenId: string } | null {
    const colonIndex = refreshToken.indexOf(':')
    if (colonIndex === -1) return null
    return {
      accountId: refreshToken.slice(0, colonIndex),
      tokenId: refreshToken.slice(colonIndex + 1),
    }
  }
}
```

- [ ] **Step 5: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="token.service.spec"
```

Expected: PASS (4 test suites).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/interfaces/jwt-payload.interface.ts \
        apps/api/src/auth/token.service.ts \
        apps/api/src/auth/token.service.spec.ts
git commit -m "refactor(auth): simplify JWT payload to sub+email, remove memberId"
```

---

## Task 3: Simplify AccountRepositoryInterface and InMemoryAccountRepository

**Files:**

- Modify: `apps/api/src/auth/interfaces/account.repository.interface.ts`
- Modify: `apps/api/src/auth/interfaces/index.ts`
- Modify: `apps/api/src/auth/infrastructure/in-memory-account.repository.ts`
- Modify: `apps/api/src/auth/infrastructure/in-memory-account.repository.spec.ts`
- Modify: `apps/api/src/auth/infrastructure/prisma-account.repository.ts`

- [ ] **Step 1: Update `in-memory-account.repository.spec.ts` — write failing tests**

```ts
// apps/api/src/auth/infrastructure/in-memory-account.repository.spec.ts
import { InMemoryAccountRepository } from './in-memory-account.repository'

describe('InMemoryAccountRepository', () => {
  let repo: InMemoryAccountRepository

  beforeEach(() => {
    repo = new InMemoryAccountRepository()
  })

  describe('create', () => {
    it('returns account with generated id and provided fields', async () => {
      const result = await repo.create({
        email: 'a@b.com',
        passwordHash: 'hash',
        firstName: 'Ana',
        lastName: 'García',
      })
      expect(result.id).toBeDefined()
      expect(result.email).toBe('a@b.com')
      expect(result.passwordHash).toBe('hash')
    })
  })

  describe('findByEmail', () => {
    it('returns account when email matches', async () => {
      await repo.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      const result = await repo.findByEmail('a@b.com')
      expect(result?.email).toBe('a@b.com')
    })

    it('returns null when no account matches', async () => {
      expect(await repo.findByEmail('none@b.com')).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns account when id matches', async () => {
      const created = await repo.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      const result = await repo.findById(created.id)
      expect(result?.id).toBe(created.id)
    })

    it('returns null when id does not exist', async () => {
      expect(await repo.findById('nonexistent')).toBeNull()
    })
  })

  describe('seed', () => {
    it('pre-populates accounts accessible via findByEmail', async () => {
      repo.seed([
        {
          id: 'seeded-id',
          email: 'seeded@b.com',
          passwordHash: 'h',
          firstName: 'S',
          lastName: 'T',
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const result = await repo.findByEmail('seeded@b.com')
      expect(result?.id).toBe('seeded-id')
    })
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-account.repository.spec"
```

Expected: FAIL — `findById` not defined.

- [ ] **Step 3: Update `account.repository.interface.ts`**

```ts
// apps/api/src/auth/interfaces/account.repository.interface.ts
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
```

- [ ] **Step 4: Update `interfaces/index.ts`**

```ts
// apps/api/src/auth/interfaces/index.ts
export type { AccountRepositoryInterface } from './account.repository.interface'
export type { CreateAccountData } from './account.repository.interface'
export type { TokenStoreInterface } from './token.store.interface'
export type { AuthContext } from './auth-context.interface'
export type { JwtPayload } from './jwt-payload.interface'
export type { TokenPair } from './token-pair.interface'
```

- [ ] **Step 5: Update `in-memory-account.repository.ts`**

```ts
// apps/api/src/auth/infrastructure/in-memory-account.repository.ts
import { randomUUID } from 'crypto'

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
    return Promise.resolve(this.accounts.find((a) => a.email === email) ?? null)
  }

  findById(id: string): Promise<Prisma.AccountModel | null> {
    return Promise.resolve(this.accounts.find((a) => a.id === id) ?? null)
  }

  create(data: CreateAccountData): Promise<Prisma.AccountModel> {
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
```

- [ ] **Step 6: Update `prisma-account.repository.ts`**

```ts
// apps/api/src/auth/infrastructure/prisma-account.repository.ts
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
```

- [ ] **Step 7: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-account.repository.spec"
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/auth/interfaces/account.repository.interface.ts \
        apps/api/src/auth/interfaces/index.ts \
        apps/api/src/auth/infrastructure/in-memory-account.repository.ts \
        apps/api/src/auth/infrastructure/in-memory-account.repository.spec.ts \
        apps/api/src/auth/infrastructure/prisma-account.repository.ts
git commit -m "refactor(auth): simplify AccountRepository — remove memberships, add findById"
```

---

## Task 4: Organization and Invitation interfaces

**Files:**

- Create: `apps/api/src/organizations/interfaces/organization.repository.interface.ts`
- Create: `apps/api/src/organizations/interfaces/invitation.store.interface.ts`
- Create: `apps/api/src/organizations/interfaces/index.ts`
- Create: `apps/api/src/organizations/organizations.tokens.ts`

No TDD step — interfaces don't have logic to test.

- [ ] **Step 1: Create `organization.repository.interface.ts`**

```ts
// apps/api/src/organizations/interfaces/organization.repository.interface.ts
import { Role } from '@glossops/database'
import type { Prisma } from '@glossops/database'

export type OrganizationWithRole = Prisma.OrganizationModel & { role: Role }

export type MemberWithAccount = Prisma.OrganizationMemberModel & {
  account: Pick<
    Prisma.AccountModel,
    'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
  >
}

export interface CreateOrgData {
  name: string
  slug: string
}

export interface UpdateOrgData {
  name?: string
  logoUrl?: string | null
}

export interface OrganizationRepositoryInterface {
  findById(id: string): Promise<Prisma.OrganizationModel | null>
  findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]>
  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel>
  createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }>
  listMembers(organizationId: string): Promise<MemberWithAccount[]>
  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null>
  countMembershipsByAccount(accountId: string): Promise<number>
  addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel>
}
```

> **Note on `findMember` and `addMember`:** `OrganizationMember` links to `branchId`, not `organizationId`. The Prisma implementation joins through `Branch`. The in-memory implementation scans branches to resolve organization membership. The interface stays clean with `organizationId` parameters.

- [ ] **Step 2: Create `invitation.store.interface.ts`**

```ts
// apps/api/src/organizations/interfaces/invitation.store.interface.ts
import type { Role } from '@glossops/database'

export interface InvitationPayload {
  orgId: string
  email: string
  role: Role
}

export interface InvitationStoreInterface {
  save(
    token: string,
    payload: InvitationPayload,
    ttlDays: number
  ): Promise<void>
  get(token: string): Promise<InvitationPayload | null>
  delete(token: string): Promise<void>
}
```

- [ ] **Step 3: Create `interfaces/index.ts`**

```ts
// apps/api/src/organizations/interfaces/index.ts
export type { OrganizationRepositoryInterface } from './organization.repository.interface'
export type { OrganizationWithRole } from './organization.repository.interface'
export type { MemberWithAccount } from './organization.repository.interface'
export type { CreateOrgData } from './organization.repository.interface'
export type { UpdateOrgData } from './organization.repository.interface'
export type { InvitationStoreInterface } from './invitation.store.interface'
export type { InvitationPayload } from './invitation.store.interface'
```

- [ ] **Step 4: Create `organizations.tokens.ts`**

```ts
// apps/api/src/organizations/organizations.tokens.ts
export const ORGANIZATION_REPOSITORY = Symbol('OrganizationRepositoryInterface')
export const INVITATION_STORE = Symbol('InvitationStoreInterface')
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/organizations/
git commit -m "feat(organizations): add repository and invitation store interfaces"
```

---

## Task 5: InMemoryOrganizationRepository

**Files:**

- Create: `apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts`
- Create: `apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts
import { Role } from '@glossops/database'

import { InMemoryOrganizationRepository } from './in-memory-organization.repository'

const makeAccount = (id: string, email = `${id}@test.com`) => ({
  id,
  email,
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
})

describe('InMemoryOrganizationRepository', () => {
  let repo: InMemoryOrganizationRepository

  beforeEach(() => {
    repo = new InMemoryOrganizationRepository()
  })

  describe('createWithBranch', () => {
    it('creates org, a main branch, and an OWNER member for the given account', async () => {
      const { organization, member } = await repo.createWithBranch(
        { name: 'Taller', slug: 'taller' },
        'acc-1'
      )
      expect(organization.name).toBe('Taller')
      expect(organization.slug).toBe('taller')
      expect(member.accountId).toBe('acc-1')
      expect(member.role).toBe(Role.OWNER)
    })
  })

  describe('findById', () => {
    it('returns org when id matches', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      expect(await repo.findById(organization.id)).toMatchObject({
        id: organization.id,
      })
    })

    it('returns null when not found', async () => {
      expect(await repo.findById('unknown')).toBeNull()
    })
  })

  describe('findAllByAccountId', () => {
    it('returns orgs the account is a member of with their role', async () => {
      await repo.createWithBranch({ name: 'A', slug: 'a' }, 'acc-1')
      await repo.createWithBranch({ name: 'B', slug: 'b' }, 'acc-1')
      const orgs = await repo.findAllByAccountId('acc-1')
      expect(orgs).toHaveLength(2)
      expect(orgs[0].role).toBe(Role.OWNER)
    })

    it('returns empty array when account has no memberships', async () => {
      expect(await repo.findAllByAccountId('nobody')).toEqual([])
    })
  })

  describe('findMember', () => {
    it('returns member when account belongs to org', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const member = await repo.findMember('acc-1', organization.id)
      expect(member?.accountId).toBe('acc-1')
    })

    it('returns null when account is not a member', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      expect(await repo.findMember('other-acc', organization.id)).toBeNull()
    })
  })

  describe('update', () => {
    it('updates org name', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'Old', slug: 's' },
        'acc-1'
      )
      const updated = await repo.update(organization.id, { name: 'New' })
      expect(updated.name).toBe('New')
    })
  })

  describe('countMembershipsByAccount', () => {
    it('counts distinct organizations the account belongs to', async () => {
      await repo.createWithBranch({ name: 'A', slug: 'a' }, 'acc-1')
      await repo.createWithBranch({ name: 'B', slug: 'b' }, 'acc-1')
      expect(await repo.countMembershipsByAccount('acc-1')).toBe(2)
    })

    it('returns 0 when account has no memberships', async () => {
      expect(await repo.countMembershipsByAccount('nobody')).toBe(0)
    })
  })

  describe('addMember', () => {
    it('adds a new member to the main branch of the org', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const member = await repo.addMember(
        organization.id,
        'acc-2',
        Role.TECHNICIAN
      )
      expect(member.accountId).toBe('acc-2')
      expect(member.role).toBe(Role.TECHNICIAN)
    })
  })

  describe('listMembers', () => {
    it('returns members with account info for the given org', async () => {
      const { organization } = await repo.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      repo.seedAccounts([makeAccount('acc-1')])
      const members = await repo.listMembers(organization.id)
      expect(members).toHaveLength(1)
      expect(members[0].account.id).toBe('acc-1')
    })
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-organization.repository.spec"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `in-memory-organization.repository.ts`**

```ts
// apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts
import { randomUUID } from 'crypto'

import { Role } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type {
  CreateOrgData,
  MemberWithAccount,
  OrganizationRepositoryInterface,
  OrganizationWithRole,
  UpdateOrgData,
} from '@organizations/interfaces'

export class InMemoryOrganizationRepository implements OrganizationRepositoryInterface {
  private organizations = new Map<string, Prisma.OrganizationModel>()
  private branches = new Map<string, Prisma.BranchModel>()
  private members = new Map<string, Prisma.OrganizationMemberModel>()
  private accounts = new Map<
    string,
    Pick<
      Prisma.AccountModel,
      'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
    >
  >()

  seedAccounts(
    accounts: Pick<
      Prisma.AccountModel,
      'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
    >[]
  ): void {
    accounts.forEach((a) => this.accounts.set(a.id, a))
  }

  findById(id: string): Promise<Prisma.OrganizationModel | null> {
    return Promise.resolve(this.organizations.get(id) ?? null)
  }

  findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]> {
    const result: OrganizationWithRole[] = []
    for (const member of this.members.values()) {
      if (member.accountId !== accountId) continue
      const branch = this.branches.get(member.branchId)
      if (!branch) continue
      const org = this.organizations.get(branch.organizationId)
      if (!org) continue
      result.push({ ...org, role: member.role })
    }
    return Promise.resolve(result)
  }

  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel> {
    const org = this.organizations.get(id)
    if (!org) return Promise.reject(new Error('organization not found'))
    const updated = { ...org, ...data, updatedAt: new Date() }
    this.organizations.set(id, updated)
    return Promise.resolve(updated)
  }

  createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }> {
    const now = new Date()
    const orgId = randomUUID()
    const branchId = randomUUID()

    const organization: Prisma.OrganizationModel = {
      id: orgId,
      name: data.name,
      slug: data.slug,
      logoUrl: null,
      createdAt: now,
      updatedAt: now,
    }

    const branch: Prisma.BranchModel = {
      id: branchId,
      organizationId: orgId,
      name: data.name,
      address: null,
      phone: null,
      email: null,
      isMain: true,
      createdAt: now,
      updatedAt: now,
    }

    const member: Prisma.OrganizationMemberModel = {
      id: randomUUID(),
      branchId,
      accountId,
      role: Role.OWNER,
      joinedAt: now,
    }

    this.organizations.set(orgId, organization)
    this.branches.set(branchId, branch)
    this.members.set(member.id, member)

    return Promise.resolve({ organization, member })
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    const orgBranchIds = new Set(
      [...this.branches.values()]
        .filter((b) => b.organizationId === organizationId)
        .map((b) => b.id)
    )

    const result: MemberWithAccount[] = []
    for (const member of this.members.values()) {
      if (!orgBranchIds.has(member.branchId)) continue
      const account = this.accounts.get(member.accountId)
      if (!account) continue
      result.push({ ...member, account })
    }
    return Promise.resolve(result)
  }

  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null> {
    const orgBranchIds = new Set(
      [...this.branches.values()]
        .filter((b) => b.organizationId === organizationId)
        .map((b) => b.id)
    )

    for (const member of this.members.values()) {
      if (member.accountId === accountId && orgBranchIds.has(member.branchId)) {
        return Promise.resolve(member)
      }
    }
    return Promise.resolve(null)
  }

  countMembershipsByAccount(accountId: string): Promise<number> {
    const orgIds = new Set<string>()
    for (const member of this.members.values()) {
      if (member.accountId !== accountId) continue
      const branch = this.branches.get(member.branchId)
      if (branch) orgIds.add(branch.organizationId)
    }
    return Promise.resolve(orgIds.size)
  }

  addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel> {
    const mainBranch = [...this.branches.values()].find(
      (b) => b.organizationId === organizationId && b.isMain
    )
    if (!mainBranch) return Promise.reject(new Error('main branch not found'))

    const member: Prisma.OrganizationMemberModel = {
      id: randomUUID(),
      branchId: mainBranch.id,
      accountId,
      role,
      joinedAt: new Date(),
    }
    this.members.set(member.id, member)
    return Promise.resolve(member)
  }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-organization.repository.spec"
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts \
        apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts
git commit -m "feat(organizations): add InMemoryOrganizationRepository"
```

---

## Task 6: InMemoryInvitationStore

**Files:**

- Create: `apps/api/src/organizations/infrastructure/in-memory-invitation.store.ts`
- Create: `apps/api/src/organizations/infrastructure/in-memory-invitation.store.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/organizations/infrastructure/in-memory-invitation.store.spec.ts
import { Role } from '@glossops/database'

import { InMemoryInvitationStore } from './in-memory-invitation.store'

const payload = { orgId: 'org-1', email: 'a@b.com', role: Role.TECHNICIAN }

describe('InMemoryInvitationStore', () => {
  let store: InMemoryInvitationStore

  beforeEach(() => {
    store = new InMemoryInvitationStore()
  })

  it('returns payload after saving a token', async () => {
    await store.save('tok-1', payload, 7)
    expect(await store.get('tok-1')).toEqual(payload)
  })

  it('returns null for unknown token', async () => {
    expect(await store.get('unknown')).toBeNull()
  })

  it('returns null after deleting a token', async () => {
    await store.save('tok-1', payload, 7)
    await store.delete('tok-1')
    expect(await store.get('tok-1')).toBeNull()
  })

  it('returns null when TTL has expired', async () => {
    await store.save('tok-1', payload, -1) // negative days = already expired
    expect(await store.get('tok-1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-invitation.store.spec"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `in-memory-invitation.store.ts`**

```ts
// apps/api/src/organizations/infrastructure/in-memory-invitation.store.ts
import type {
  InvitationPayload,
  InvitationStoreInterface,
} from '@organizations/interfaces'

export class InMemoryInvitationStore implements InvitationStoreInterface {
  private readonly store = new Map<
    string,
    { payload: InvitationPayload; expiresAt: Date }
  >()

  save(
    token: string,
    payload: InvitationPayload,
    ttlDays: number
  ): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttlDays)
    this.store.set(token, { payload, expiresAt })
    return Promise.resolve()
  }

  get(token: string): Promise<InvitationPayload | null> {
    const entry = this.store.get(token)
    if (!entry) return Promise.resolve(null)
    if (entry.expiresAt < new Date()) {
      this.store.delete(token)
      return Promise.resolve(null)
    }
    return Promise.resolve(entry.payload)
  }

  delete(token: string): Promise<void> {
    this.store.delete(token)
    return Promise.resolve()
  }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-invitation.store.spec"
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/organizations/infrastructure/in-memory-invitation.store.ts \
        apps/api/src/organizations/infrastructure/in-memory-invitation.store.spec.ts
git commit -m "feat(organizations): add InMemoryInvitationStore"
```

---

## Task 7: Update RegisterDto and AuthService

**Files:**

- Modify: `apps/api/src/auth/dto/register.dto.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Update `auth.service.spec.ts` — add org repository + update assertions**

Replace the full file:

```ts
// apps/api/src/auth/auth.service.spec.ts
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'

import type { TokenPair } from '@auth/interfaces'

import { ACCOUNT_REPOSITORY, TOKEN_STORE } from './auth.tokens'
import { ORGANIZATION_REPOSITORY } from '../organizations/organizations.tokens'
import { InMemoryAccountRepository } from './infrastructure/in-memory-account.repository'
import { InMemoryOrganizationRepository } from '../organizations/infrastructure/in-memory-organization.repository'
import { InMemoryTokenStore } from './infrastructure/in-memory-token.store'
import { TokenService } from './token.service'
import { AuthService } from './auth.service'

jest.mock('@config', () => ({
  envs: { redis: { url: 'redis://localhost:6379' } },
}))

jest.mock('bcrypt')

const mockTokenPair: TokenPair = {
  accessToken: 'access.token',
  refreshToken: 'acc-id:tok-id',
  expiresIn: 900,
}

describe('AuthService', () => {
  let service: AuthService
  let accounts: InMemoryAccountRepository
  let organizations: InMemoryOrganizationRepository
  let tokenStore: InMemoryTokenStore
  let tokenService: jest.Mocked<TokenService>

  beforeEach(async () => {
    jest.clearAllMocks()
    accounts = new InMemoryAccountRepository()
    organizations = new InMemoryOrganizationRepository()
    tokenStore = new InMemoryTokenStore()

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
        { provide: ORGANIZATION_REPOSITORY, useValue: organizations },
        { provide: TOKEN_STORE, useValue: tokenStore },
        {
          provide: TokenService,
          useValue: {
            issueTokens: jest.fn().mockResolvedValue(mockTokenPair),
            rotateTokens: jest.fn().mockResolvedValue(mockTokenPair),
            parseRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(AuthService)
    tokenService = module.get(TokenService)
  })

  describe('register', () => {
    const dto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Ana',
      lastName: 'García',
      organizationName: 'Taller Test',
      organizationSlug: 'taller-test',
    }

    it('throws ConflictException when email is already registered', async () => {
      await accounts.create({
        email: dto.email,
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never)
      await expect(service.register(dto)).rejects.toThrow(ConflictException)
    })

    it('hashes password with bcrypt before storing', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never)
      await service.register(dto)
      const stored = await accounts.findByEmail(dto.email)
      expect(stored?.passwordHash).toBe('hashed-pw')
    })

    it('creates organization with the given name and slug', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never)
      await service.register(dto)
      const stored = await accounts.findByEmail(dto.email)
      const orgs = await organizations.findAllByAccountId(stored!.id)
      expect(orgs).toHaveLength(1)
      expect(orgs[0].name).toBe('Taller Test')
      expect(orgs[0].slug).toBe('taller-test')
    })

    it('issues tokens with account id and email', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never)
      await service.register(dto)
      expect(tokenService.issueTokens).toHaveBeenCalledWith(
        expect.any(String),
        dto.email
      )
    })
  })

  describe('login', () => {
    const dto = { email: 'user@example.com', password: 'correct-pass' }

    beforeEach(async () => {
      await accounts.create({
        email: dto.email,
        passwordHash: 'hashed',
        firstName: 'User',
        lastName: 'Test',
      })
    })

    it('throws UnauthorizedException when account does not exist', async () => {
      await expect(
        service.login({ email: 'none@example.com', password: 'p' })
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when password is wrong', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never)
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException)
    })

    it('issues tokens with account id and email', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)
      await service.login(dto)
      expect(tokenService.issueTokens).toHaveBeenCalledWith(
        expect.any(String),
        dto.email
      )
    })
  })

  describe('refresh', () => {
    it('throws UnauthorizedException for malformed refresh token', async () => {
      tokenService.parseRefreshToken.mockReturnValue(null)
      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException when token is not in store', async () => {
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'acc',
        tokenId: 'tok',
      })
      await expect(service.refresh('acc:tok')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException when account no longer exists', async () => {
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'ghost-id',
        tokenId: 'tok-id',
      })
      await tokenStore.save('ghost-id', 'tok-id', 30)
      await expect(service.refresh('ghost-id:tok-id')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('rotates tokens using account email', async () => {
      const created = await accounts.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      await tokenStore.save(created.id, 'tok-id', 30)
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: created.id,
        tokenId: 'tok-id',
      })
      tokenService.rotateTokens.mockResolvedValue(mockTokenPair)

      const result = await service.refresh(`${created.id}:tok-id`)

      expect(tokenService.rotateTokens).toHaveBeenCalledWith(
        created.id,
        'tok-id',
        'a@b.com'
      )
      expect(result).toEqual(mockTokenPair)
    })
  })

  describe('logout', () => {
    it('revokes the refresh token from the store', async () => {
      await tokenStore.save('acc-id', 'tok-id', 30)
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'acc-id',
        tokenId: 'tok-id',
      })
      await service.logout('acc-id', 'acc-id:tok-id')
      expect(await tokenStore.exists('acc-id', 'tok-id')).toBe(false)
    })

    it('does nothing when refresh token belongs to a different account', async () => {
      await tokenStore.save('other-acc', 'tok-id', 30)
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'other-acc',
        tokenId: 'tok-id',
      })
      await service.logout('acc-id', 'other-acc:tok-id')
      expect(await tokenStore.exists('other-acc', 'tok-id')).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
pnpm --filter api test -- --testPathPattern="auth.service.spec"
```

Expected: FAIL — `ORGANIZATION_REPOSITORY` not injected, `issueTokens` called with wrong args.

- [ ] **Step 3: Update `register.dto.ts`**

```ts
// apps/api/src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organizationName: string

  @IsString()
  @MinLength(1)
  @MaxLength(63)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  organizationSlug: string
}
```

- [ ] **Step 4: Update `auth.service.ts`**

```ts
// apps/api/src/auth/auth.service.ts
import * as bcrypt from 'bcrypt'
import {
  UnauthorizedException,
  ConflictException,
  Injectable,
  Inject,
} from '@nestjs/common'

import { RegisterDto, LoginDto } from '@auth/dto'
import type {
  TokenPair,
  AccountRepositoryInterface,
  TokenStoreInterface,
} from '@auth/interfaces'
import type { OrganizationRepositoryInterface } from '@organizations/interfaces'

import { ORGANIZATION_REPOSITORY } from '../organizations/organizations.tokens'
import { ACCOUNT_REPOSITORY, TOKEN_STORE } from './auth.tokens'
import { TokenService } from './token.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryInterface,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepositoryInterface,
    @Inject(TOKEN_STORE) private readonly tokenStore: TokenStoreInterface,
    private readonly tokenService: TokenService
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.accounts.findByEmail(dto.email)
    if (existing)
      throw new ConflictException({ error: 'email_already_registered' })

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const account = await this.accounts.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    })

    await this.organizations.createWithBranch(
      { name: dto.organizationName, slug: dto.organizationSlug },
      account.id
    )

    return this.tokenService.issueTokens(account.id, account.email)
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const account = await this.accounts.findByEmail(dto.email)
    if (!account)
      throw new UnauthorizedException({ error: 'invalid_credentials' })

    const valid = await bcrypt.compare(dto.password, account.passwordHash)
    if (!valid)
      throw new UnauthorizedException({ error: 'invalid_credentials' })

    return this.tokenService.issueTokens(account.id, account.email)
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken)
    if (!parsed)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    const { accountId, tokenId } = parsed
    const exists = await this.tokenStore.exists(accountId, tokenId)
    if (!exists)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    const account = await this.accounts.findById(accountId)
    if (!account)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    return this.tokenService.rotateTokens(accountId, tokenId, account.email)
  }

  async logout(accountId: string, refreshToken: string): Promise<void> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken)
    if (!parsed || parsed.accountId !== accountId) return
    await this.tokenStore.delete(parsed.accountId, parsed.tokenId)
  }
}
```

- [ ] **Step 5: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="auth.service.spec"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/dto/register.dto.ts \
        apps/api/src/auth/auth.service.ts \
        apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): register creates org, simplify login/refresh token issuance"
```

---

## Task 8: Update AuthGuard

**Files:**

- Modify: `apps/api/src/auth/guards/auth.guard.ts`
- Modify: `apps/api/src/auth/guards/auth.guard.spec.ts`

- [ ] **Step 1: Update `auth.guard.spec.ts` — full rewrite**

```ts
// apps/api/src/auth/guards/auth.guard.spec.ts
import {
  ForbiddenException,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'

import type { AuthContext } from '@auth/interfaces'

import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { ORGANIZATION_REPOSITORY } from '../../organizations/organizations.tokens'
import { InMemoryAccountRepository } from '../infrastructure/in-memory-account.repository'
import { InMemoryOrganizationRepository } from '../../organizations/infrastructure/in-memory-organization.repository'
import { TokenService } from '../token.service'
import { AuthGuard } from './auth.guard'

jest.mock('@glossops/database', () => ({
  Role: {
    OWNER: 'OWNER',
    MANAGER: 'MANAGER',
    TECHNICIAN: 'TECHNICIAN',
    FRONT_DESK: 'FRONT_DESK',
  },
}))

jest.mock('@config', () => ({
  envs: { jwt: { accessSecret: 'test-secret' } },
}))

type TestCtx = ExecutionContext & {
  _request: {
    headers: { authorization?: string; 'x-organization-id'?: string }
    user?: AuthContext
  }
}

const makeCtx = (authHeader?: string, orgId?: string): TestCtx => {
  const request = {
    headers: { authorization: authHeader, 'x-organization-id': orgId },
    user: undefined as AuthContext | undefined,
  }
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
    _request: request,
  } as unknown as TestCtx
}

const mockAccount = {
  id: 'acc-uuid',
  email: 'test@example.com',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('AuthGuard', () => {
  let guard: AuthGuard
  let accounts: InMemoryAccountRepository
  let organizations: InMemoryOrganizationRepository
  let tokenService: jest.Mocked<TokenService>
  let reflector: jest.Mocked<Reflector>

  beforeEach(async () => {
    accounts = new InMemoryAccountRepository()
    accounts.seed([mockAccount])
    organizations = new InMemoryOrganizationRepository()

    const module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
        { provide: ORGANIZATION_REPOSITORY, useValue: organizations },
        {
          provide: TokenService,
          useValue: {
            verifyAccessToken: jest.fn().mockResolvedValue({
              sub: 'acc-uuid',
              email: 'test@example.com',
            }),
          },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile()

    guard = module.get(AuthGuard)
    tokenService = module.get(TokenService)
    reflector = module.get(Reflector)
  })

  it('allows public routes without any token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    expect(await guard.canActivate(makeCtx())).toBe(true)
  })

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    await expect(guard.canActivate(makeCtx())).rejects.toThrow(
      UnauthorizedException
    )
  })

  it('throws UnauthorizedException when token verification fails', async () => {
    tokenService.verifyAccessToken.mockRejectedValueOnce(new Error('expired'))
    await expect(
      guard.canActivate(makeCtx('Bearer bad.token'))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('throws UnauthorizedException when account not found', async () => {
    tokenService.verifyAccessToken.mockResolvedValueOnce({
      sub: 'nonexistent-id',
      email: 'x@x.com',
    })
    await expect(
      guard.canActivate(makeCtx('Bearer valid.token'))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('attaches AuthContext with null org fields when no X-Organization-Id header', async () => {
    const ctx = makeCtx('Bearer valid.token')
    await guard.canActivate(ctx)
    expect(ctx._request.user).toEqual({
      sub: 'acc-uuid',
      email: 'test@example.com',
      memberId: null,
      branchId: null,
      organizationId: null,
      role: null,
    })
  })

  it('throws ForbiddenException when account is not a member of the given org', async () => {
    await expect(
      guard.canActivate(makeCtx('Bearer valid.token', 'unknown-org-id'))
    ).rejects.toThrow(ForbiddenException)
  })

  it('attaches full AuthContext when account is a valid member of the org', async () => {
    const { organization } = await organizations.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-uuid'
    )
    const ctx = makeCtx('Bearer valid.token', organization.id)
    await guard.canActivate(ctx)
    expect(ctx._request.user).toMatchObject({
      sub: 'acc-uuid',
      email: 'test@example.com',
      organizationId: organization.id,
      role: 'OWNER',
    })
    expect(ctx._request.user?.memberId).toBeDefined()
    expect(ctx._request.user?.branchId).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
pnpm --filter api test -- --testPathPattern="auth.guard.spec"
```

Expected: FAIL — guard still uses old logic.

- [ ] **Step 3: Update `auth.guard.ts`**

```ts
// apps/api/src/auth/guards/auth.guard.ts
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  ForbiddenException,
  UnauthorizedException,
  ExecutionContext,
  CanActivate,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { AuthContext, AccountRepositoryInterface } from '@auth/interfaces'
import { IS_PUBLIC_KEY } from '@auth/decorators'
import type { OrganizationRepositoryInterface } from '@organizations/interfaces'

import { ORGANIZATION_REPOSITORY } from '../../organizations/organizations.tokens'
import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { TokenService } from '../token.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryInterface,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepositoryInterface,
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractToken(request)
    if (!token) throw new UnauthorizedException()

    let payload: { sub: string; email: string }
    try {
      payload = await this.tokenService.verifyAccessToken(token)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ error: 'token_expired' })
      }
      throw new UnauthorizedException()
    }

    const account = await this.accounts.findById(payload.sub)
    if (!account) throw new UnauthorizedException()

    const orgId = request.headers['x-organization-id'] as string | undefined

    const user: AuthContext = {
      sub: account.id,
      email: account.email,
      memberId: null,
      branchId: null,
      organizationId: null,
      role: null,
    }

    if (orgId) {
      const member = await this.organizations.findMember(account.id, orgId)
      if (!member) throw new ForbiddenException({ error: 'not_a_member' })
      user.memberId = member.id
      user.branchId = member.branchId
      user.organizationId = orgId
      user.role = member.role
    }

    request['user'] = user
    return true
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="auth.guard.spec"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/guards/auth.guard.ts \
        apps/api/src/auth/guards/auth.guard.spec.ts
git commit -m "feat(auth): resolve org context from X-Organization-Id header in AuthGuard"
```

---

## Task 9: OrganizationService

**Files:**

- Create: `apps/api/src/organizations/organizations.service.ts`
- Create: `apps/api/src/organizations/organizations.service.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/organizations/organizations.service.spec.ts
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import { Role } from '@glossops/database'

import { ACCOUNT_REPOSITORY } from '../auth/auth.tokens'
import { InMemoryAccountRepository } from '../auth/infrastructure/in-memory-account.repository'
import { InMemoryOrganizationRepository } from './infrastructure/in-memory-organization.repository'
import { InMemoryInvitationStore } from './infrastructure/in-memory-invitation.store'
import {
  ORGANIZATION_REPOSITORY,
  INVITATION_STORE,
} from './organizations.tokens'
import { OrganizationService } from './organizations.service'

jest.mock('@config', () => ({
  envs: {
    invitation: { expiresInDays: 7 },
    app: { frontendUrl: 'http://localhost:3001' },
  },
}))

jest.mock('bcrypt')

describe('OrganizationService', () => {
  let service: OrganizationService
  let organizations: InMemoryOrganizationRepository
  let invitationStore: InMemoryInvitationStore
  let accounts: InMemoryAccountRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    organizations = new InMemoryOrganizationRepository()
    invitationStore = new InMemoryInvitationStore()
    accounts = new InMemoryAccountRepository()

    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: ORGANIZATION_REPOSITORY, useValue: organizations },
        { provide: INVITATION_STORE, useValue: invitationStore },
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
      ],
    }).compile()

    service = module.get(OrganizationService)
  })

  describe('getMyOrganization', () => {
    it('returns the org when found', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const result = await service.getMyOrganization(organization.id)
      expect(result.id).toBe(organization.id)
    })

    it('throws NotFoundException when org does not exist', async () => {
      await expect(service.getMyOrganization('unknown')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('listMyOrganizations', () => {
    it('returns all orgs the account belongs to', async () => {
      await organizations.createWithBranch({ name: 'A', slug: 'a' }, 'acc-1')
      await organizations.createWithBranch({ name: 'B', slug: 'b' }, 'acc-1')
      const result = await service.listMyOrganizations('acc-1')
      expect(result).toHaveLength(2)
    })
  })

  describe('updateOrganization', () => {
    it('updates and returns the org', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'Old', slug: 's' },
        'acc-1'
      )
      const result = await service.updateOrganization(organization.id, {
        name: 'New',
      })
      expect(result.name).toBe('New')
    })
  })

  describe('listMembers', () => {
    it('returns members for the org', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      organizations.seedAccounts([
        {
          id: 'acc-1',
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
          avatarUrl: null,
        },
      ])
      const result = await service.listMembers(organization.id)
      expect(result).toHaveLength(1)
    })
  })

  describe('createInvitation', () => {
    it('returns an invitationUrl containing the token', async () => {
      const { invitationUrl } = await service.createInvitation(
        'org-1',
        'a@b.com',
        Role.TECHNICIAN
      )
      expect(invitationUrl).toContain('http://localhost:3001')
      expect(invitationUrl).toContain('token=')
    })

    it('saves the token in the invitation store', async () => {
      const { invitationUrl } = await service.createInvitation(
        'org-1',
        'a@b.com',
        Role.TECHNICIAN
      )
      const token = new URL(invitationUrl).searchParams.get('token')!
      const payload = await invitationStore.get(token)
      expect(payload).toEqual({
        orgId: 'org-1',
        email: 'a@b.com',
        role: Role.TECHNICIAN,
      })
    })
  })

  describe('acceptInvitation', () => {
    let orgId: string

    beforeEach(async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'owner-acc'
      )
      orgId = organization.id
    })

    it('throws BadRequestException for invalid or expired token', async () => {
      await expect(
        service.acceptInvitation({ token: 'bad-token' })
      ).rejects.toThrow(BadRequestException)
    })

    it('adds existing account as member and deletes the token', async () => {
      const existing = await accounts.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      await invitationStore.save(
        'tok-1',
        { orgId, email: 'a@b.com', role: Role.TECHNICIAN },
        7
      )

      const result = await service.acceptInvitation({ token: 'tok-1' })

      expect(result.id).toBe(existing.id)
      expect(await invitationStore.get('tok-1')).toBeNull()
      const member = await organizations.findMember(existing.id, orgId)
      expect(member?.role).toBe(Role.TECHNICIAN)
    })

    it('creates new account + membership when email has no account and deletes token', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never)
      await invitationStore.save(
        'tok-2',
        { orgId, email: 'new@b.com', role: Role.FRONT_DESK },
        7
      )

      const result = await service.acceptInvitation({
        token: 'tok-2',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
      })

      expect(result.email).toBe('new@b.com')
      expect(await invitationStore.get('tok-2')).toBeNull()
    })

    it('throws BadRequestException when new account fields missing', async () => {
      await invitationStore.save(
        'tok-3',
        { orgId, email: 'new@b.com', role: Role.FRONT_DESK },
        7
      )
      await expect(
        service.acceptInvitation({ token: 'tok-3' })
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when account is already a member', async () => {
      const existing = await accounts.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      await organizations.addMember(orgId, existing.id, Role.TECHNICIAN)
      await invitationStore.save(
        'tok-4',
        { orgId, email: 'a@b.com', role: Role.TECHNICIAN },
        7
      )

      await expect(
        service.acceptInvitation({ token: 'tok-4' })
      ).rejects.toThrow(ConflictException)
    })

    it('throws UnprocessableEntityException when org cap of 5 is reached', async () => {
      const existing = await accounts.create({
        email: 'capped@b.com',
        passwordHash: 'h',
        firstName: 'C',
        lastName: 'D',
      })
      for (let i = 0; i < 5; i++) {
        const { organization } = await organizations.createWithBranch(
          { name: `O${i}`, slug: `o${i}` },
          existing.id
        )
        void organization
      }
      await invitationStore.save(
        'tok-5',
        { orgId, email: 'capped@b.com', role: Role.FRONT_DESK },
        7
      )

      await expect(
        service.acceptInvitation({ token: 'tok-5' })
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('does not delete token when accept fails (retry safe)', async () => {
      const existing = await accounts.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      await organizations.addMember(orgId, existing.id, Role.TECHNICIAN)
      await invitationStore.save(
        'tok-6',
        { orgId, email: 'a@b.com', role: Role.TECHNICIAN },
        7
      )

      await expect(
        service.acceptInvitation({ token: 'tok-6' })
      ).rejects.toThrow(ConflictException)
      expect(await invitationStore.get('tok-6')).not.toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
pnpm --filter api test -- --testPathPattern="organizations.service.spec"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `organizations.service.ts`**

```ts
// apps/api/src/organizations/organizations.service.ts
import * as bcrypt from 'bcrypt'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { randomUUID } from 'crypto'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import type { AccountRepositoryInterface } from '@auth/interfaces'
import { ACCOUNT_REPOSITORY } from '../auth/auth.tokens'

import { envs } from '@config'

import type {
  InvitationStoreInterface,
  MemberWithAccount,
  OrganizationRepositoryInterface,
  OrganizationWithRole,
  UpdateOrgData,
} from '@organizations/interfaces'

import {
  INVITATION_STORE,
  ORGANIZATION_REPOSITORY,
} from './organizations.tokens'

const ORG_MEMBERSHIP_CAP = 5

export interface AcceptInvitationDto {
  token: string
  firstName?: string
  lastName?: string
  password?: string
}

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepositoryInterface,
    @Inject(INVITATION_STORE)
    private readonly invitationStore: InvitationStoreInterface,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryInterface
  ) {}

  async getMyOrganization(
    organizationId: string
  ): Promise<Prisma.OrganizationModel> {
    const org = await this.organizations.findById(organizationId)
    if (!org) throw new NotFoundException({ error: 'organization_not_found' })
    return org
  }

  listMyOrganizations(accountId: string): Promise<OrganizationWithRole[]> {
    return this.organizations.findAllByAccountId(accountId)
  }

  updateOrganization(
    organizationId: string,
    data: UpdateOrgData
  ): Promise<Prisma.OrganizationModel> {
    return this.organizations.update(organizationId, data)
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    return this.organizations.listMembers(organizationId)
  }

  async createInvitation(
    organizationId: string,
    email: string,
    role: Role
  ): Promise<{ invitationUrl: string }> {
    const token = randomUUID()
    await this.invitationStore.save(
      token,
      { orgId: organizationId, email, role },
      envs.invitation.expiresInDays
    )
    const invitationUrl = `${envs.app.frontendUrl}/invitations/accept?token=${token}`
    return { invitationUrl }
  }

  async acceptInvitation(
    dto: AcceptInvitationDto
  ): Promise<Prisma.AccountModel> {
    const payload = await this.invitationStore.get(dto.token)
    if (!payload) throw new BadRequestException({ error: 'invalid_invitation' })

    const { orgId, email, role } = payload

    let account = await this.accounts.findByEmail(email)

    if (!account) {
      if (!dto.firstName || !dto.lastName || !dto.password) {
        throw new BadRequestException({ error: 'invalid_invitation' })
      }
      const passwordHash = await bcrypt.hash(dto.password, 12)
      account = await this.accounts.create({
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      })
    }

    const orgCount = await this.organizations.countMembershipsByAccount(
      account.id
    )
    if (orgCount >= ORG_MEMBERSHIP_CAP) {
      throw new UnprocessableEntityException({
        error: 'organization_limit_reached',
      })
    }

    const existingMember = await this.organizations.findMember(
      account.id,
      orgId
    )
    if (existingMember)
      throw new ConflictException({ error: 'already_a_member' })

    await this.organizations.addMember(orgId, account.id, role)
    await this.invitationStore.delete(dto.token)

    return account
  }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="organizations.service.spec"
```

Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/organizations/organizations.service.ts \
        apps/api/src/organizations/organizations.service.spec.ts
git commit -m "feat(organizations): add OrganizationService with invitation flow"
```

---

## Task 10: OrganizationController and DTOs

**Files:**

- Create: `apps/api/src/organizations/dto/update-org.dto.ts`
- Create: `apps/api/src/organizations/dto/create-invitation.dto.ts`
- Create: `apps/api/src/organizations/dto/accept-invitation.dto.ts`
- Create: `apps/api/src/organizations/dto/index.ts`
- Create: `apps/api/src/organizations/organizations.controller.ts`

No TDD — controllers are thin HTTP adapters with no business logic.

- [ ] **Step 1: Create DTOs**

```ts
// apps/api/src/organizations/dto/update-org.dto.ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  logoUrl?: string | null
}
```

```ts
// apps/api/src/organizations/dto/create-invitation.dto.ts
import { IsEmail, IsEnum } from 'class-validator'
import { Role } from '@glossops/database'

export class CreateInvitationDto {
  @IsEmail()
  email: string

  @IsEnum(Role)
  role: Role
}
```

```ts
// apps/api/src/organizations/dto/accept-invitation.dto.ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class AcceptInvitationDto {
  @IsString()
  token: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string
}
```

```ts
// apps/api/src/organizations/dto/index.ts
export { AcceptInvitationDto } from './accept-invitation.dto'
export { CreateInvitationDto } from './create-invitation.dto'
export { UpdateOrgDto } from './update-org.dto'
```

- [ ] **Step 2: Create `organizations.controller.ts`**

```ts
// apps/api/src/organizations/organizations.controller.ts
import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext, TokenPair } from '@auth/interfaces'

import type {
  MemberWithAccount,
  OrganizationWithRole,
} from '@organizations/interfaces'

import { TokenService } from '../auth/token.service'
import { Public } from '../auth/decorators/public.decorator'
import { AcceptInvitationDto, CreateInvitationDto, UpdateOrgDto } from './dto'
import { OrganizationService } from './organizations.service'

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly orgService: OrganizationService,
    private readonly tokenService: TokenService
  ) {}

  @Get()
  listMyOrganizations(
    @CurrentAccount() account: AuthContext
  ): Promise<OrganizationWithRole[]> {
    return this.orgService.listMyOrganizations(account.sub)
  }

  @Get('me')
  getMyOrganization(
    @CurrentAccount() account: AuthContext
  ): Promise<Prisma.OrganizationModel> {
    return this.orgService.getMyOrganization(account.organizationId!)
  }

  @Patch('me')
  @Roles(Role.OWNER, Role.MANAGER)
  updateOrganization(
    @CurrentAccount() account: AuthContext,
    @Body() dto: UpdateOrgDto
  ): Promise<Prisma.OrganizationModel> {
    return this.orgService.updateOrganization(account.organizationId!, dto)
  }

  @Get('me/members')
  listMembers(
    @CurrentAccount() account: AuthContext
  ): Promise<MemberWithAccount[]> {
    return this.orgService.listMembers(account.organizationId!)
  }

  @Post('invitations')
  @Roles(Role.OWNER, Role.MANAGER)
  createInvitation(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateInvitationDto
  ): Promise<{ invitationUrl: string }> {
    return this.orgService.createInvitation(
      account.organizationId!,
      dto.email,
      dto.role
    )
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(200)
  async acceptInvitation(@Body() dto: AcceptInvitationDto): Promise<TokenPair> {
    const account = await this.orgService.acceptInvitation(dto)
    return this.tokenService.issueTokens(account.id, account.email)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/organizations/dto/ \
        apps/api/src/organizations/organizations.controller.ts
git commit -m "feat(organizations): add controller and DTOs"
```

---

## Task 11: Prisma and Redis infrastructure implementations

**Files:**

- Create: `apps/api/src/organizations/infrastructure/prisma-organization.repository.ts`
- Create: `apps/api/src/organizations/infrastructure/redis-invitation.store.ts`

No unit tests — these are production adapters that require real infrastructure (tested by integration tests).

- [ ] **Step 1: Create `prisma-organization.repository.ts`**

```ts
// apps/api/src/organizations/infrastructure/prisma-organization.repository.ts
import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import { PrismaService } from '@prisma'

import type {
  CreateOrgData,
  MemberWithAccount,
  OrganizationRepositoryInterface,
  OrganizationWithRole,
  UpdateOrgData,
} from '@organizations/interfaces'

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Prisma.OrganizationModel | null> {
    return this.prisma.organization.findUnique({ where: { id } })
  }

  async findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { accountId },
      include: { branch: { include: { organization: true } } },
    })
    return members.map((m) => ({ ...m.branch.organization, role: m.role }))
  }

  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel> {
    return this.prisma.organization.update({ where: { id }, data })
  }

  async createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }> {
    const organization = await this.prisma.organization.create({
      data: { name: data.name, slug: data.slug },
    })

    const branch = await this.prisma.branch.create({
      data: { organizationId: organization.id, name: data.name, isMain: true },
    })

    const member = await this.prisma.organizationMember.create({
      data: { branchId: branch.id, accountId, role: Role.OWNER },
    })

    return { organization, member }
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    return this.prisma.organizationMember.findMany({
      where: { branch: { organizationId } },
      include: {
        account: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    }) as Promise<MemberWithAccount[]>
  }

  async findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null> {
    return this.prisma.organizationMember.findFirst({
      where: { accountId, branch: { organizationId } },
    })
  }

  async countMembershipsByAccount(accountId: string): Promise<number> {
    const members = await this.prisma.organizationMember.findMany({
      where: { accountId },
      include: { branch: { select: { organizationId: true } } },
    })
    const orgIds = new Set(members.map((m) => m.branch.organizationId))
    return orgIds.size
  }

  addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel> {
    return this.prisma.organizationMember.create({
      data: {
        accountId,
        role,
        branch: {
          connect: { organizationId_isMain: { organizationId, isMain: true } },
        },
      },
    })
  }
}
```

> **Note on `addMember`:** Uses a compound unique index `organizationId_isMain` to find the main branch. If Prisma does not generate this compound index helper, replace with a `findFirst` + `create`:
>
> ```ts
> async addMember(organizationId: string, accountId: string, role: Role) {
>   const branch = await this.prisma.branch.findFirst({ where: { organizationId, isMain: true } })
>   return this.prisma.organizationMember.create({ data: { branchId: branch!.id, accountId, role } })
> }
> ```

- [ ] **Step 2: Create `redis-invitation.store.ts`**

```ts
// apps/api/src/organizations/infrastructure/redis-invitation.store.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

import { envs } from '@config'

import type {
  InvitationPayload,
  InvitationStoreInterface,
} from '@organizations/interfaces'

@Injectable()
export class RedisInvitationStore
  implements InvitationStoreInterface, OnModuleDestroy
{
  private readonly client: Redis

  constructor() {
    this.client = new Redis(envs.redis.url)
  }

  async save(
    token: string,
    payload: InvitationPayload,
    ttlDays: number
  ): Promise<void> {
    const key = `invitation:${token}`
    await this.client.set(
      key,
      JSON.stringify(payload),
      'EX',
      ttlDays * 24 * 60 * 60
    )
  }

  async get(token: string): Promise<InvitationPayload | null> {
    const key = `invitation:${token}`
    const value = await this.client.get(key)
    if (!value) return null
    return JSON.parse(value) as InvitationPayload
  }

  async delete(token: string): Promise<void> {
    await this.client.del(`invitation:${token}`)
  }

  async onModuleDestroy() {
    await this.client.quit()
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/organizations/infrastructure/prisma-organization.repository.ts \
        apps/api/src/organizations/infrastructure/redis-invitation.store.ts
git commit -m "feat(organizations): add Prisma and Redis infrastructure implementations"
```

---

## Task 12: Wire up modules and barrel exports

**Files:**

- Create: `apps/api/src/organizations/organizations.module.ts`
- Create: `apps/api/src/organizations/index.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `organizations.module.ts`**

```ts
// apps/api/src/organizations/organizations.module.ts
import { forwardRef, Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'
import { AuthModule } from '@auth'

import { PrismaOrganizationRepository } from './infrastructure/prisma-organization.repository'
import { RedisInvitationStore } from './infrastructure/redis-invitation.store'
import {
  INVITATION_STORE,
  ORGANIZATION_REPOSITORY,
} from './organizations.tokens'
import { OrganizationController } from './organizations.controller'
import { OrganizationService } from './organizations.service'

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [OrganizationController],
  providers: [
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: PrismaOrganizationRepository,
    },
    { provide: INVITATION_STORE, useClass: RedisInvitationStore },
    OrganizationService,
  ],
  exports: [ORGANIZATION_REPOSITORY, INVITATION_STORE],
})
export class OrganizationsModule {}
```

- [ ] **Step 2: Create `organizations/index.ts`**

```ts
// apps/api/src/organizations/index.ts
export { OrganizationsModule } from './organizations.module'
export { OrganizationService } from './organizations.service'
```

- [ ] **Step 3: Update `auth.module.ts`**

```ts
// apps/api/src/auth/auth.module.ts
import { forwardRef, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { envs } from '@config'

import { OrganizationsModule } from '../organizations/organizations.module'
import { PrismaAccountRepository } from './infrastructure/prisma-account.repository'
import { RedisTokenStore } from './infrastructure/redis-token.store'
import { ACCOUNT_REPOSITORY, TOKEN_STORE } from './auth.tokens'
import { AuthController } from './auth.controller'
import { TokenService } from './token.service'
import { AuthService } from './auth.service'

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: envs.jwt.accessSecret,
      signOptions: { expiresIn: envs.jwt.accessExpiresInSeconds },
    }),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [AuthController],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: TOKEN_STORE, useClass: RedisTokenStore },
    TokenService,
    AuthService,
    RolesGuard,
    AuthGuard,
  ],
  exports: [AuthGuard, RolesGuard, TokenService, JwtModule, ACCOUNT_REPOSITORY],
})
export class AuthModule {}
```

- [ ] **Step 4: Update `app.module.ts`**

```ts
// apps/api/src/app.module.ts
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { Module } from '@nestjs/common'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { AuthModule } from '@auth'

import { OrganizationsModule } from './organizations/organizations.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Run all tests — expect full pass**

```bash
pnpm --filter api test
```

Expected: ALL tests pass. If TypeScript errors appear, fix them before continuing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/organizations/organizations.module.ts \
        apps/api/src/organizations/index.ts \
        apps/api/src/auth/auth.module.ts \
        apps/api/src/app.module.ts
git commit -m "feat(organizations): wire OrganizationsModule, update AuthModule with forwardRef"
```

---

## Final verification

- [ ] Run the full test suite:

```bash
pnpm --filter api test
```

Expected: All tests pass with no TypeScript errors.

- [ ] Build to check for compile errors:

```bash
pnpm --filter api build
```

Expected: Build succeeds with no errors.
