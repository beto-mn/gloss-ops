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
