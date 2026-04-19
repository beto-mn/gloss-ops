import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'

import { RedisTokenStore } from './redis-token.store'
import { TokenService } from './token.service'

jest.mock('@config', () => ({
  envs: { jwt: { refreshExpiresInDays: 30, accessExpiresInSeconds: 900 } },
}))

describe('TokenService', () => {
  let tokenService: TokenService
  let redisStore: jest.Mocked<RedisTokenStore>
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
        {
          provide: RedisTokenStore,
          useValue: {
            save: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile()

    tokenService = module.get(TokenService)
    redisStore = module.get(RedisTokenStore)
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

    it('saves refresh token to Redis with 30-day TTL', async () => {
      await tokenService.issueTokens('acc-1', 'mem-1')
      expect(redisStore.save).toHaveBeenCalledWith(
        'acc-1',
        expect.any(String),
        30
      )
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
    it('deletes old token before issuing new ones', async () => {
      await tokenService.rotateTokens('acc-1', 'old-tok', 'mem-1')
      expect(redisStore.delete).toHaveBeenCalledWith('acc-1', 'old-tok')
      expect(redisStore.save).toHaveBeenCalled()
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
