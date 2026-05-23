import * as bcrypt from 'bcrypt'
import { UnauthorizedException, Injectable, Inject } from '@nestjs/common'

import type { OrganizationRepositoryInterface } from '@organizations/interfaces'
import { RegisterDto, LoginDto } from '@auth/dto'
import type {
  AccountRepositoryInterface,
  TokenStoreInterface,
  TokenPair,
} from '@auth/interfaces'

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
    const spaceIdx = dto.name.indexOf(' ')
    const firstName =
      spaceIdx === -1 ? dto.name : dto.name.slice(0, spaceIdx).trim()
    const lastName = spaceIdx === -1 ? '' : dto.name.slice(spaceIdx + 1).trim()

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const account = await this.accounts.create({
      email: dto.email,
      passwordHash,
      firstName,
      lastName,
    })

    const slug = dto.orgName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    await this.organizations.createWithBranch(
      { name: dto.orgName, slug },
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
