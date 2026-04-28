import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { RegisterDto, LoginDto, TokenResponseDto } from '@auth/dto'
import { CurrentAccount, Public } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { AuthService } from './auth.service'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new account and organization' })
  register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto)
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  refresh(
    @Body('refreshToken') refreshToken: string
  ): Promise<TokenResponseDto> {
    return this.authService.refresh(refreshToken)
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  logout(
    @CurrentAccount() account: AuthContext,
    @Body('refreshToken') refreshToken: string
  ): Promise<void> {
    return this.authService.logout(account.sub, refreshToken)
  }
}
