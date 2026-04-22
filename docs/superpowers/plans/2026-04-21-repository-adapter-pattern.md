# Repository & Adapter Pattern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple `AuthService`, `AuthGuard`, and `TokenService` from Prisma and Redis by introducing repository interfaces and in-memory implementations, establishing the pattern for all future domain modules.

**Architecture:** Define `AccountRepositoryInterface` and `TokenStoreInterface` in `auth/interfaces/`. Bind them to concrete implementations (`PrismaAccountRepository`, `RedisTokenStore`) in `auth.module.ts` via NestJS injection tokens. Provide `InMemoryAccountRepository` and `InMemoryTokenStore` as test-only implementations that replace all Prisma/Redis mocks.

**Tech Stack:** NestJS DI with `@Inject()`, TypeScript interfaces, `Prisma.AccountGetPayload` for derived types, Jest `InMemoryX` classes.

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `apps/api/src/auth/interfaces/account.repository.interface.ts` | `AccountRepositoryInterface`, `AccountWithMemberships`, `CreateAccountData` |
| `apps/api/src/auth/interfaces/token.store.interface.ts` | `TokenStoreInterface` |
| `apps/api/src/auth/auth.tokens.ts` | `ACCOUNT_REPOSITORY`, `TOKEN_STORE` injection symbols |
| `apps/api/src/auth/infrastructure/prisma-account.repository.ts` | Prisma implementation of `AccountRepositoryInterface` |
| `apps/api/src/auth/infrastructure/redis-token.store.ts` | Redis implementation of `TokenStoreInterface` (moved) |
| `apps/api/src/auth/infrastructure/redis-token.store.spec.ts` | Concrete Redis store tests (moved) |
| `apps/api/src/auth/infrastructure/in-memory-account.repository.ts` | In-memory implementation for tests |
| `apps/api/src/auth/infrastructure/in-memory-token.store.ts` | In-memory implementation for tests |

### Modified Files
| File | Change |
|------|--------|
| `apps/api/src/auth/interfaces/index.ts` | Add exports for new interfaces and types |
| `apps/api/src/auth/auth.service.ts` | Inject `ACCOUNT_REPOSITORY` + `TOKEN_STORE` instead of concrete classes |
| `apps/api/src/auth/token.service.ts` | Inject `TOKEN_STORE` instead of `RedisTokenStore` |
| `apps/api/src/auth/guards/auth.guard.ts` | Inject `ACCOUNT_REPOSITORY` instead of `PrismaService` |
| `apps/api/src/auth/auth.module.ts` | Bind tokens to implementations, remove `RedisTokenStore` export |
| `apps/api/src/auth/index.ts` | Remove `RedisTokenStore` export |
| `apps/api/src/auth/auth.service.spec.ts` | Replace Prisma/Redis mocks with in-memory implementations |
| `apps/api/src/auth/token.service.spec.ts` | Replace `RedisTokenStore` mock with `InMemoryTokenStore` |
| `apps/api/src/auth/guards/auth.guard.spec.ts` | Replace `PrismaService` mock with `InMemoryAccountRepository` |
| `CLAUDE.md` | Document repository pattern as standard for all modules |

### Deleted Files
- `apps/api/src/auth/redis-token.store.ts` (moved to `infrastructure/`)
- `apps/api/src/auth/redis-token.store.spec.ts` (moved to `infrastructure/`)

---

## Task 1: Define interfaces and injection tokens

**Files:**
- Create: `apps/api/src/auth/interfaces/account.repository.interface.ts`
- Create: `apps/api/src/auth/interfaces/token.store.interface.ts`
- Create: `apps/api/src/auth/auth.tokens.ts`
- Modify: `apps/api/src/auth/interfaces/index.ts`

- [ ] **Step 1: Create `account.repository.interface.ts`**

```ts
// apps/api/src/auth/interfaces/account.repository.interface.ts
import type { Account, Prisma } from '@glossops/database'

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
  create(data: CreateAccountData): Promise<Account>
}
```

> Note: `findByEmail` returns the full `AccountWithMemberships` (including memberships) so `login` can read `memberId` without a second query.

- [ ] **Step 2: Create `token.store.interface.ts`**

```ts
// apps/api/src/auth/interfaces/token.store.interface.ts
export interface TokenStoreInterface {
  save(accountId: string, tokenId: string, ttlDays: number): Promise<void>
  exists(accountId: string, tokenId: string): Promise<boolean>
  delete(accountId: string, tokenId: string): Promise<void>
}
```

- [ ] **Step 3: Create `auth.tokens.ts`**

```ts
// apps/api/src/auth/auth.tokens.ts
export const ACCOUNT_REPOSITORY = Symbol('AccountRepositoryInterface')
export const TOKEN_STORE = Symbol('TokenStoreInterface')
```

- [ ] **Step 4: Update `interfaces/index.ts`** — sorted longest → shortest line

```ts
// apps/api/src/auth/interfaces/index.ts
export type { AccountRepositoryInterface } from './account.repository.interface'
export type { AccountWithMemberships } from './account.repository.interface'
export type { CreateAccountData } from './account.repository.interface'
export type { TokenStoreInterface } from './token.store.interface'
export type { AuthContext } from './auth-context.interface'
export type { JwtPayload } from './jwt-payload.interface'
export type { TokenPair } from './token-pair.interface'
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/interfaces/account.repository.interface.ts \
        apps/api/src/auth/interfaces/token.store.interface.ts \
        apps/api/src/auth/auth.tokens.ts \
        apps/api/src/auth/interfaces/index.ts
git commit -m "feat(auth): define AccountRepositoryInterface and TokenStoreInterface"
```

---

## Task 2: InMemoryTokenStore (TDD)

**Files:**
- Create: `apps/api/src/auth/infrastructure/in-memory-token.store.ts`
- Create: `apps/api/src/auth/infrastructure/in-memory-token.store.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/auth/infrastructure/in-memory-token.store.spec.ts
import { InMemoryTokenStore } from './in-memory-token.store'

describe('InMemoryTokenStore', () => {
  let store: InMemoryTokenStore

  beforeEach(() => {
    store = new InMemoryTokenStore()
  })

  it('save → exists returns true', async () => {
    await store.save('acc', 'tok', 30)
    expect(await store.exists('acc', 'tok')).toBe(true)
  })

  it('exists returns false for unknown token', async () => {
    expect(await store.exists('acc', 'unknown')).toBe(false)
  })

  it('delete → exists returns false', async () => {
    await store.save('acc', 'tok', 30)
    await store.delete('acc', 'tok')
    expect(await store.exists('acc', 'tok')).toBe(false)
  })

  it('does not cross-contaminate different accounts', async () => {
    await store.save('acc-1', 'tok', 30)
    expect(await store.exists('acc-2', 'tok')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npx jest in-memory-token.store --no-coverage
```

Expected: FAIL — `Cannot find module './in-memory-token.store'`

- [ ] **Step 3: Implement `InMemoryTokenStore`**

```ts
// apps/api/src/auth/infrastructure/in-memory-token.store.ts
import type { TokenStoreInterface } from '@auth/interfaces'

export class InMemoryTokenStore implements TokenStoreInterface {
  private readonly tokens = new Map<string, true>()

  async save(accountId: string, tokenId: string, _ttlDays: number): Promise<void> {
    this.tokens.set(`${accountId}:${tokenId}`, true)
  }

  async exists(accountId: string, tokenId: string): Promise<boolean> {
    return this.tokens.has(`${accountId}:${tokenId}`)
  }

  async delete(accountId: string, tokenId: string): Promise<void> {
    this.tokens.delete(`${accountId}:${tokenId}`)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npx jest in-memory-token.store --no-coverage
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/infrastructure/in-memory-token.store.ts \
        apps/api/src/auth/infrastructure/in-memory-token.store.spec.ts
git commit -m "feat(auth): add InMemoryTokenStore for testing"
```

---

## Task 3: InMemoryAccountRepository (TDD)

**Files:**
- Create: `apps/api/src/auth/infrastructure/in-memory-account.repository.ts`
- Create: `apps/api/src/auth/infrastructure/in-memory-account.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

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
      await repo.create({ email: 'a@b.com', passwordHash: 'h', firstName: 'A', lastName: 'B' })
      const result = await repo.findByEmail('a@b.com')
      expect(result?.email).toBe('a@b.com')
      expect(result?.memberships).toEqual([])
    })

    it('returns null when no account matches', async () => {
      expect(await repo.findByEmail('none@b.com')).toBeNull()
    })
  })

  describe('findByIdWithMemberships', () => {
    it('returns account with empty memberships after create', async () => {
      const created = await repo.create({ email: 'a@b.com', passwordHash: 'h', firstName: 'A', lastName: 'B' })
      const result = await repo.findByIdWithMemberships(created.id)
      expect(result?.id).toBe(created.id)
      expect(result?.memberships).toEqual([])
    })

    it('returns null when id does not exist', async () => {
      expect(await repo.findByIdWithMemberships('nonexistent')).toBeNull()
    })
  })

  describe('seed', () => {
    it('pre-populates accounts accessible via findByEmail', async () => {
      repo.seed([{
        id: 'seeded-id',
        email: 'seeded@b.com',
        passwordHash: 'h',
        firstName: 'S',
        lastName: 'T',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [],
      }])
      const result = await repo.findByEmail('seeded@b.com')
      expect(result?.id).toBe('seeded-id')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npx jest in-memory-account.repository --no-coverage
```

Expected: FAIL — `Cannot find module './in-memory-account.repository'`

- [ ] **Step 3: Implement `InMemoryAccountRepository`**

```ts
// apps/api/src/auth/infrastructure/in-memory-account.repository.ts
import { randomUUID } from 'crypto'

import type { Account } from '@glossops/database'

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
    return this.accounts.find(a => a.email === email) ?? null
  }

  async findByIdWithMemberships(id: string): Promise<AccountWithMemberships | null> {
    return this.accounts.find(a => a.id === id) ?? null
  }

  async create(data: CreateAccountData): Promise<Account> {
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npx jest in-memory-account.repository --no-coverage
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/infrastructure/in-memory-account.repository.ts \
        apps/api/src/auth/infrastructure/in-memory-account.repository.spec.ts
git commit -m "feat(auth): add InMemoryAccountRepository for testing"
```

---

## Task 4: PrismaAccountRepository

**Files:**
- Create: `apps/api/src/auth/infrastructure/prisma-account.repository.ts`

No unit test — this is infrastructure. It is covered by integration tests when they exist.

- [ ] **Step 1: Create `PrismaAccountRepository`**

```ts
// apps/api/src/auth/infrastructure/prisma-account.repository.ts
import { Injectable } from '@nestjs/common'

import type { Account } from '@glossops/database'

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

  async findByIdWithMemberships(id: string): Promise<AccountWithMemberships | null> {
    return this.prisma.account.findUnique({
      where: { id },
      include: { memberships: { include: { branch: true } } },
    })
  }

  async create(data: CreateAccountData): Promise<Account> {
    return this.prisma.account.create({ data })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/infrastructure/prisma-account.repository.ts
git commit -m "feat(auth): add PrismaAccountRepository"
```

---

## Task 5: Move RedisTokenStore to infrastructure/

**Files:**
- Create: `apps/api/src/auth/infrastructure/redis-token.store.ts`
- Create: `apps/api/src/auth/infrastructure/redis-token.store.spec.ts`
- Delete: `apps/api/src/auth/redis-token.store.ts`
- Delete: `apps/api/src/auth/redis-token.store.spec.ts`

- [ ] **Step 1: Create `infrastructure/redis-token.store.ts`** — add `implements TokenStoreInterface`

```ts
// apps/api/src/auth/infrastructure/redis-token.store.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

import type { TokenStoreInterface } from '@auth/interfaces'
import { envs } from '@config'

@Injectable()
export class RedisTokenStore implements TokenStoreInterface, OnModuleDestroy {
  private readonly client: Redis

  constructor() {
    this.client = new Redis(envs.redis.url)
  }

  async save(accountId: string, tokenId: string, ttlDays: number): Promise<void> {
    const key = `refresh:${accountId}:${tokenId}`
    await this.client.set(key, '1', 'EX', ttlDays * 24 * 60 * 60)
  }

  async exists(accountId: string, tokenId: string): Promise<boolean> {
    const key = `refresh:${accountId}:${tokenId}`
    return (await this.client.exists(key)) === 1
  }

  async delete(accountId: string, tokenId: string): Promise<void> {
    const key = `refresh:${accountId}:${tokenId}`
    await this.client.del(key)
  }

  async onModuleDestroy() {
    await this.client.quit()
  }
}
```

- [ ] **Step 2: Create `infrastructure/redis-token.store.spec.ts`** — identical content to `auth/redis-token.store.spec.ts` but with updated import path

```ts
// apps/api/src/auth/infrastructure/redis-token.store.spec.ts
import { Test, TestingModule } from '@nestjs/testing'

import { RedisTokenStore } from './redis-token.store'

jest.mock('@config', () => ({
  envs: { redis: { url: 'redis://localhost:6379' } },
}))

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  exists: jest.fn().mockResolvedValue(0),
  del: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue(undefined),
}

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis))

describe('RedisTokenStore', () => {
  let store: RedisTokenStore

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisTokenStore],
    }).compile()
    store = module.get(RedisTokenStore)
  })

  describe('save', () => {
    it('calls SET with correct key and TTL in seconds', async () => {
      await store.save('acc-1', 'tok-1', 30)
      expect(mockRedis.set).toHaveBeenCalledWith(
        'refresh:acc-1:tok-1',
        '1',
        'EX',
        30 * 24 * 60 * 60
      )
    })
  })

  describe('exists', () => {
    it('returns true when key exists in Redis', async () => {
      mockRedis.exists.mockResolvedValueOnce(1)
      expect(await store.exists('acc-1', 'tok-1')).toBe(true)
    })

    it('returns false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValueOnce(0)
      expect(await store.exists('acc-1', 'missing')).toBe(false)
    })
  })

  describe('delete', () => {
    it('calls DEL with correct key', async () => {
      await store.delete('acc-1', 'tok-1')
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:acc-1:tok-1')
    })
  })
})
```

- [ ] **Step 3: Delete old files**

```bash
git rm apps/api/src/auth/redis-token.store.ts apps/api/src/auth/redis-token.store.spec.ts
```

- [ ] **Step 4: Run moved spec to verify it still passes**

```bash
cd apps/api && npx jest infrastructure/redis-token.store --no-coverage
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/infrastructure/redis-token.store.ts \
        apps/api/src/auth/infrastructure/redis-token.store.spec.ts
git commit -m "refactor(auth): move RedisTokenStore to infrastructure/ and implement TokenStoreInterface"
```

---

## Task 6: Refactor TokenService

**Files:**
- Modify: `apps/api/src/auth/token.service.ts`
- Modify: `apps/api/src/auth/token.service.spec.ts`

- [ ] **Step 1: Update `token.service.ts`** — inject `TOKEN_STORE` instead of `RedisTokenStore`

```ts
// apps/api/src/auth/token.service.ts
import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'crypto'

import type { JwtPayload, TokenPair, TokenStoreInterface } from '@auth/interfaces'
import { envs } from '@config'

import { TOKEN_STORE } from './auth.tokens'

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(TOKEN_STORE) private readonly tokenStore: TokenStoreInterface
  ) {}

  async issueTokens(
    accountId: string,
    memberId: string | null
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: accountId, memberId }
    const accessToken = await this.jwtService.signAsync(payload)
    const tokenId = randomUUID()
    await this.tokenStore.save(accountId, tokenId, envs.jwt.refreshExpiresInDays)
    return {
      accessToken,
      refreshToken: `${accountId}:${tokenId}`,
      expiresIn: envs.jwt.accessExpiresInSeconds,
    }
  }

  async rotateTokens(
    accountId: string,
    tokenId: string,
    memberId: string | null
  ): Promise<TokenPair> {
    await this.tokenStore.delete(accountId, tokenId)
    return this.issueTokens(accountId, memberId)
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

- [ ] **Step 2: Rewrite `token.service.spec.ts`** — use `InMemoryTokenStore` via `TOKEN_STORE` token

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
              .mockResolvedValue({ sub: 'acc-1', memberId: 'mem-1' }),
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
    it('signs access token with sub and memberId', async () => {
      await tokenService.issueTokens('acc-1', 'mem-1')
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'acc-1',
        memberId: 'mem-1',
      })
    })

    it('signs access token with null memberId when account has no membership', async () => {
      await tokenService.issueTokens('acc-1', null)
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'acc-1',
        memberId: null,
      })
    })

    it('saves refresh token to store', async () => {
      const result = await tokenService.issueTokens('acc-1', 'mem-1')
      const tokenId = result.refreshToken.slice('acc-1:'.length)
      expect(await tokenStore.exists('acc-1', tokenId)).toBe(true)
    })

    it('returns accessToken, refreshToken with accountId prefix, and expiresIn 900', async () => {
      const result = await tokenService.issueTokens('acc-1', 'mem-1')
      expect(result).toMatchObject({
        accessToken: 'signed.jwt.token',
        refreshToken: expect.stringMatching(/^acc-1:/),
        expiresIn: 900,
      })
    })
  })

  describe('rotateTokens', () => {
    it('revokes old token and issues new one', async () => {
      const first = await tokenService.issueTokens('acc-1', 'mem-1')
      const oldTokenId = first.refreshToken.slice('acc-1:'.length)

      await tokenService.rotateTokens('acc-1', oldTokenId, 'mem-1')

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
      expect(result).toEqual({ sub: 'acc-1', memberId: 'mem-1' })
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd apps/api && npx jest token.service --no-coverage
```

Expected: PASS — 7 tests.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/token.service.ts apps/api/src/auth/token.service.spec.ts
git commit -m "refactor(auth): inject TokenStoreInterface into TokenService via TOKEN_STORE token"
```

---

## Task 7: Refactor AuthService

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Update `auth.service.ts`** — inject `ACCOUNT_REPOSITORY` + `TOKEN_STORE`

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

import { ACCOUNT_REPOSITORY, TOKEN_STORE } from './auth.tokens'
import { TokenService } from './token.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepositoryInterface,
    private readonly tokenService: TokenService,
    @Inject(TOKEN_STORE) private readonly tokenStore: TokenStoreInterface
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

    return this.tokenService.issueTokens(account.id, null)
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const account = await this.accounts.findByEmail(dto.email)
    if (!account)
      throw new UnauthorizedException({ error: 'invalid_credentials' })

    const valid = await bcrypt.compare(dto.password, account.passwordHash)
    if (!valid)
      throw new UnauthorizedException({ error: 'invalid_credentials' })

    const memberId = account.memberships[0]?.id ?? null
    return this.tokenService.issueTokens(account.id, memberId)
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken)
    if (!parsed)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    const { accountId, tokenId } = parsed
    const exists = await this.tokenStore.exists(accountId, tokenId)
    if (!exists)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    const account = await this.accounts.findByIdWithMemberships(accountId)
    if (!account)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    const memberId = account.memberships[0]?.id ?? null
    return this.tokenService.rotateTokens(accountId, tokenId, memberId)
  }

  async logout(accountId: string, refreshToken: string): Promise<void> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken)
    if (!parsed || parsed.accountId !== accountId) return
    await this.tokenStore.delete(parsed.accountId, parsed.tokenId)
  }
}
```

- [ ] **Step 2: Rewrite `auth.service.spec.ts`** — use `InMemoryAccountRepository` + `InMemoryTokenStore`

```ts
// apps/api/src/auth/auth.service.spec.ts
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'

import type { TokenPair } from '@auth/interfaces'

import { ACCOUNT_REPOSITORY, TOKEN_STORE } from './auth.tokens'
import { InMemoryAccountRepository } from './infrastructure/in-memory-account.repository'
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
  let tokenStore: InMemoryTokenStore
  let tokenService: jest.Mocked<TokenService>

  beforeEach(async () => {
    jest.clearAllMocks()
    accounts = new InMemoryAccountRepository()
    tokenStore = new InMemoryTokenStore()

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
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
    }

    it('throws ConflictException when email is already registered', async () => {
      await accounts.create({ email: dto.email, passwordHash: 'h', firstName: 'A', lastName: 'B' })
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never)
      await expect(service.register(dto)).rejects.toThrow(ConflictException)
    })

    it('hashes password with bcrypt before storing', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never)
      await service.register(dto)
      const stored = await accounts.findByEmail(dto.email)
      expect(stored?.passwordHash).toBe('hashed-pw')
    })

    it('issues tokens with null memberId for new account', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never)
      await service.register(dto)
      expect(tokenService.issueTokens).toHaveBeenCalledWith(
        expect.any(String),
        null
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

    it('issues tokens with null memberId when account has no membership', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)
      await service.login(dto)
      expect(tokenService.issueTokens).toHaveBeenCalledWith(
        expect.any(String),
        null
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

    it('rotates tokens using current memberId from store', async () => {
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
        null
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

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd apps/api && npx jest auth.service --no-coverage
```

Expected: PASS — 10 tests.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "refactor(auth): inject AccountRepositoryInterface and TokenStoreInterface into AuthService"
```

---

## Task 8: Refactor AuthGuard

**Files:**
- Modify: `apps/api/src/auth/guards/auth.guard.ts`
- Modify: `apps/api/src/auth/guards/auth.guard.spec.ts`

- [ ] **Step 1: Update `auth.guard.ts`** — inject `ACCOUNT_REPOSITORY` instead of `PrismaService`

```ts
// apps/api/src/auth/guards/auth.guard.ts
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  UnauthorizedException,
  ExecutionContext,
  CanActivate,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { AuthContext, AccountRepositoryInterface } from '@auth/interfaces'
import { IS_PUBLIC_KEY } from '@auth/decorators'

import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { TokenService } from '../token.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepositoryInterface,
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

    let payload: { sub: string; memberId: string | null }
    try {
      payload = await this.tokenService.verifyAccessToken(token)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ error: 'token_expired' })
      }
      throw new UnauthorizedException()
    }

    const account = await this.accounts.findByIdWithMemberships(payload.sub)
    if (!account) throw new UnauthorizedException()

    const membership = account.memberships[0] ?? null

    const user: AuthContext = {
      sub: account.id,
      memberId: membership?.id ?? null,
      email: account.email,
      branchId: membership?.branchId ?? null,
      organizationId: membership?.branch?.organizationId ?? null,
      role: membership?.role ?? null,
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

- [ ] **Step 2: Rewrite `auth.guard.spec.ts`** — use `InMemoryAccountRepository`

```ts
// apps/api/src/auth/guards/auth.guard.spec.ts
import { UnauthorizedException, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'

import type { AuthContext, AccountWithMemberships } from '@auth/interfaces'

import { ACCOUNT_REPOSITORY } from '../auth.tokens'
import { InMemoryAccountRepository } from '../infrastructure/in-memory-account.repository'
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
  _request: { headers: { authorization?: string }; user?: AuthContext }
}

const makeCtx = (authHeader?: string): TestCtx => {
  const request = {
    headers: { authorization: authHeader },
    user: undefined as AuthContext | undefined,
  }
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
    _request: request,
  } as unknown as TestCtx
}

const mockAccount: AccountWithMemberships = {
  id: 'acc-uuid',
  email: 'test@example.com',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: 'mem-uuid',
      branchId: 'branch-uuid',
      accountId: 'acc-uuid',
      role: 'OWNER' as never,
      joinedAt: new Date(),
      branch: {
        id: 'branch-uuid',
        organizationId: 'org-uuid',
        name: 'Main',
        address: null,
        phone: null,
        email: null,
        isMain: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
}

describe('AuthGuard', () => {
  let guard: AuthGuard
  let accounts: InMemoryAccountRepository
  let tokenService: jest.Mocked<TokenService>
  let reflector: jest.Mocked<Reflector>

  beforeEach(async () => {
    accounts = new InMemoryAccountRepository()
    accounts.seed([mockAccount])

    const module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
        {
          provide: TokenService,
          useValue: {
            verifyAccessToken: jest
              .fn()
              .mockResolvedValue({ sub: 'acc-uuid', memberId: 'mem-uuid' }),
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
      memberId: null,
    })
    await expect(
      guard.canActivate(makeCtx('Bearer valid.token'))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('attaches full AuthContext to request.user on valid token', async () => {
    const ctx = makeCtx('Bearer valid.token')
    await guard.canActivate(ctx)
    expect(ctx._request.user).toEqual({
      sub: 'acc-uuid',
      memberId: 'mem-uuid',
      email: 'test@example.com',
      branchId: 'branch-uuid',
      organizationId: 'org-uuid',
      role: 'OWNER',
    })
  })

  it('sets membership fields to null when account has no membership', async () => {
    accounts.seed([{ ...mockAccount, id: 'no-member-id', memberships: [] }])
    tokenService.verifyAccessToken.mockResolvedValueOnce({
      sub: 'no-member-id',
      memberId: null,
    })
    const ctx = makeCtx('Bearer valid.token')
    await guard.canActivate(ctx)
    expect(ctx._request.user).toMatchObject({
      memberId: null,
      branchId: null,
      organizationId: null,
      role: null,
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd apps/api && npx jest auth.guard --no-coverage
```

Expected: PASS — 6 tests.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/guards/auth.guard.ts apps/api/src/auth/guards/auth.guard.spec.ts
git commit -m "refactor(auth): inject AccountRepositoryInterface into AuthGuard via ACCOUNT_REPOSITORY token"
```

---

## Task 9: Wire AuthModule and update barrel

**Files:**
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/auth/index.ts`

- [ ] **Step 1: Update `auth.module.ts`** — bind tokens to implementations

```ts
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { envs } from '@config'

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
  exports: [AuthGuard, RolesGuard, TokenService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 2: Update `auth/index.ts`** — remove `RedisTokenStore` (implementation detail)

```ts
// apps/api/src/auth/index.ts
export { AuthController } from './auth.controller'
export { TokenService } from './token.service'
export { AuthService } from './auth.service'
export { AuthModule } from './auth.module'
```

- [ ] **Step 3: Run the full test suite**

```bash
cd apps/api && npx jest --no-coverage
```

Expected: all tests PASS. Verify the count matches or exceeds the previous count.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/auth.module.ts apps/api/src/auth/index.ts
git commit -m "refactor(auth): wire AuthModule with repository and token store providers"
```

---

## Task 10: Document pattern in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add repository pattern section to `CLAUDE.md`**

Add the following section after the existing "Barrel Exports (index.ts)" section:

```markdown
## Repository Pattern (all domain modules)

Every domain module MUST follow this structure:

```
<module>/
  interfaces/
    <entity>.repository.interface.ts   ← contract
    index.ts                           ← barrel (types only)
  infrastructure/
    prisma-<entity>.repository.ts      ← Prisma implementation
    in-memory-<entity>.repository.ts   ← in-memory implementation for tests
  <module>.tokens.ts                   ← DI injection token symbols
  <module>.module.ts                   ← binds tokens to implementations
  <module>.service.ts                  ← depends on interfaces only
```

**Rules:**
- `PrismaService` may only be injected inside `infrastructure/` classes — never in services, guards, or controllers
- Injection tokens are named `SCREAMING_SNAKE_CASE` and defined in `<module>.tokens.ts`
- Interface names end with `Interface` (e.g., `AccountRepositoryInterface`)
- In tests, bind `{ provide: TOKEN, useClass: InMemoryXxx }` — no Prisma/Redis mocks
- `InMemoryX` implementations live in `infrastructure/`, not in test files

See `apps/api/src/auth/` for the reference implementation.
```

- [ ] **Step 2: Run full test suite one last time**

```bash
cd apps/api && npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): document repository pattern as standard for all domain modules"
```
