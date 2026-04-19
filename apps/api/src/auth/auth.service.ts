import * as bcrypt from 'bcrypt'
import {
  UnauthorizedException,
  ConflictException,
  Injectable,
} from '@nestjs/common'

import { RegisterDto, LoginDto } from '@auth/dto'
import type { TokenPair } from '@auth/interfaces'
import { PrismaService } from '@prisma'

import { RedisTokenStore } from './redis-token.store'
import { TokenService } from './token.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly redisTokenStore: RedisTokenStore
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.account.findUnique({
      where: { email: dto.email },
    })
    if (existing)
      throw new ConflictException({ error: 'email_already_registered' })

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const account = await this.prisma.account.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    })

    return this.tokenService.issueTokens(account.id, null)
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const account = await this.prisma.account.findUnique({
      where: { email: dto.email },
      include: { memberships: true },
    })
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
    const exists = await this.redisTokenStore.exists(accountId, tokenId)
    if (!exists)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { memberships: true },
    })
    if (!account)
      throw new UnauthorizedException({ error: 'invalid_refresh_token' })

    const memberId = account.memberships[0]?.id ?? null
    return this.tokenService.rotateTokens(accountId, tokenId, memberId)
  }

  async logout(accountId: string, refreshToken: string): Promise<void> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken)
    if (!parsed || parsed.accountId !== accountId) return
    await this.redisTokenStore.delete(parsed.accountId, parsed.tokenId)
  }
}
