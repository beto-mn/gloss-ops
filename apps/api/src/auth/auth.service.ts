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
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryInterface,
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
