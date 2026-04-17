import { randomUUID } from 'crypto'
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { envs } from '../config/envs'
import { RedisTokenStore } from './redis-token.store'

export interface JwtPayload {
  sub: string
  memberId: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisTokenStore: RedisTokenStore
  ) {}

  async issueTokens(
    accountId: string,
    memberId: string | null
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: accountId, memberId }
    const accessToken = await this.jwtService.signAsync(payload)
    const tokenId = randomUUID()
    await this.redisTokenStore.save(
      accountId,
      tokenId,
      envs.jwt.refreshExpiresInDays
    )
    return {
      accessToken,
      refreshToken: `${accountId}:${tokenId}`,
      expiresIn: 900,
    }
  }

  async rotateTokens(
    accountId: string,
    tokenId: string,
    memberId: string | null
  ): Promise<TokenPair> {
    await this.redisTokenStore.delete(accountId, tokenId)
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
