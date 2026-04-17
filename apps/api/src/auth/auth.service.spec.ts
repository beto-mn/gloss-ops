import { Test } from '@nestjs/testing'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { TokenService, TokenPair } from './token.service'
import { RedisTokenStore } from './redis-token.store'
import { PrismaService } from '../prisma/prisma.service'

jest.mock('@glossops/database', () => ({
  PrismaClient: class {},
}))

jest.mock('../config/envs', () => ({
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
  let prisma: { account: { findUnique: jest.Mock; create: jest.Mock } }
  let tokenService: jest.Mocked<TokenService>
  let redisStore: jest.Mocked<RedisTokenStore>

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            account: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: TokenService,
          useValue: {
            issueTokens: jest.fn().mockResolvedValue(mockTokenPair),
            rotateTokens: jest.fn().mockResolvedValue(mockTokenPair),
            parseRefreshToken: jest.fn(),
          },
        },
        {
          provide: RedisTokenStore,
          useValue: {
            exists: jest.fn(),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile()

    service = module.get(AuthService)
    prisma = module.get(PrismaService)
    tokenService = module.get(TokenService)
    redisStore = module.get(RedisTokenStore)
  })

  describe('register', () => {
    const dto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Ana',
      lastName: 'García',
    }

    it('throws ConflictException when email is already registered', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'existing' })
      await expect(service.register(dto)).rejects.toThrow(ConflictException)
    })

    it('hashes password with bcrypt before storing', async () => {
      prisma.account.findUnique.mockResolvedValue(null)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw')
      prisma.account.create.mockResolvedValue({ id: 'new-id' })

      await service.register(dto)

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: dto.email,
          passwordHash: 'hashed-pw',
          firstName: dto.firstName,
          lastName: dto.lastName,
        }),
      })
    })

    it('issues tokens with null memberId for new account', async () => {
      prisma.account.findUnique.mockResolvedValue(null)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw')
      prisma.account.create.mockResolvedValue({ id: 'new-id' })

      await service.register(dto)

      expect(tokenService.issueTokens).toHaveBeenCalledWith('new-id', null)
    })
  })

  describe('login', () => {
    const dto = { email: 'user@example.com', password: 'correct-pass' }
    const accountWithMember = {
      id: 'acc-id',
      passwordHash: 'hashed',
      memberships: [{ id: 'mem-id' }],
    }

    it('throws UnauthorizedException when account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null)
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when password is wrong', async () => {
      prisma.account.findUnique.mockResolvedValue(accountWithMember)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException)
    })

    it('issues tokens with memberId when membership exists', async () => {
      prisma.account.findUnique.mockResolvedValue(accountWithMember)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      await service.login(dto)

      expect(tokenService.issueTokens).toHaveBeenCalledWith('acc-id', 'mem-id')
    })

    it('issues tokens with null memberId when account has no membership', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...accountWithMember,
        memberships: [],
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      await service.login(dto)

      expect(tokenService.issueTokens).toHaveBeenCalledWith('acc-id', null)
    })
  })

  describe('refresh', () => {
    it('throws UnauthorizedException for malformed refresh token', async () => {
      tokenService.parseRefreshToken.mockReturnValue(null)
      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException when token is not in Redis', async () => {
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'acc',
        tokenId: 'tok',
      })
      ;(redisStore.exists as jest.Mock).mockResolvedValue(false)
      await expect(service.refresh('acc:tok')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException when account no longer exists', async () => {
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'acc-id',
        tokenId: 'tok-id',
      })
      ;(redisStore.exists as jest.Mock).mockResolvedValue(true)
      prisma.account.findUnique.mockResolvedValue(null)
      await expect(service.refresh('acc-id:tok-id')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('rotates tokens using current memberId from DB', async () => {
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'acc-id',
        tokenId: 'tok-id',
      })
      ;(redisStore.exists as jest.Mock).mockResolvedValue(true)
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-id',
        memberships: [{ id: 'mem-id' }],
      })

      const result = await service.refresh('acc-id:tok-id')

      expect(tokenService.rotateTokens).toHaveBeenCalledWith(
        'acc-id',
        'tok-id',
        'mem-id'
      )
      expect(result).toEqual(mockTokenPair)
    })
  })

  describe('logout', () => {
    it('deletes the refresh token from Redis', async () => {
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'acc-id',
        tokenId: 'tok-id',
      })
      await service.logout('acc-id', 'acc-id:tok-id')
      expect(redisStore.delete).toHaveBeenCalledWith('acc-id', 'tok-id')
    })

    it('does nothing when refresh token belongs to a different account', async () => {
      tokenService.parseRefreshToken.mockReturnValue({
        accountId: 'other-acc',
        tokenId: 'tok-id',
      })
      await service.logout('acc-id', 'other-acc:tok-id')
      expect(redisStore.delete).not.toHaveBeenCalled()
    })
  })
})
