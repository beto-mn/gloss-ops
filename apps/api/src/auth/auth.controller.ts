import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { TokenResponseDto } from './dto/token-response.dto'
import { Public } from './decorators/public.decorator'
import { CurrentAccount } from './decorators/current-account.decorator'
import type { AuthContext } from './guards/auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto)
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body('refreshToken') refreshToken: string
  ): Promise<TokenResponseDto> {
    return this.authService.refresh(refreshToken)
  }

  @Post('logout')
  @HttpCode(200)
  logout(
    @CurrentAccount() account: AuthContext,
    @Body('refreshToken') refreshToken: string
  ): Promise<void> {
    return this.authService.logout(account.sub, refreshToken)
  }
}
