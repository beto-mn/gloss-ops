import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'

import type { TokenPair } from '@auth/interfaces'

import { InMemoryOrganizationRepository } from '../organizations/infrastructure/in-memory-organization.repository'
import { ORGANIZATION_REPOSITORY } from '../organizations/organizations.tokens'
import { InMemoryAccountRepository } from './infrastructure/in-memory-account.repository'
import { InMemoryTokenStore } from './infrastructure/in-memory-token.store'
import { ACCOUNT_REPOSITORY, TOKEN_STORE } from './auth.tokens'
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
