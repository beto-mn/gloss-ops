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
