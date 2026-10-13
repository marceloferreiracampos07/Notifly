import { Controller, Post, UseGuards, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../service/auth.service.js';
import { TokenService } from '../service/token.service.js';
import { ApiKeyService } from '../service/api-key.service.js';
import { LocalAuthGuard } from '../../../common/guards/local-auth.guard.js';
import { CreateAuthDto } from '../DTO/register.dto.js';
import { LoginDto } from '../DTO/login.dto.js';
import { CreateApiKeyDto } from '../DTO/create-api-key.dto.js';
import { RefreshTokenDto } from '../DTO/refresh-token.dto.js';
import type { UserSession } from '../../interface_user/user-session.interface.js';
import { CurrentUser } from '../../../common/decorators/get-user-decorator.js';
import { Public } from '../../../common/decorators/public-decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @CurrentUser() user: UserSession) {
    const tokenData = await this.tokenService.generateTokens(user);
    return {
      ...tokenData,
      user,
    };
  }

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() createuserdto: CreateAuthDto) {
    const user = await this.authService.registerUser(createuserdto);
    const tokenData = await this.tokenService.generateTokens(user);

    return {
      user,
      ...tokenData,
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.tokenService.refreshTokens(dto.refreshToken);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('api-keys')
  async createApiKey(@CurrentUser() user: UserSession, @Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.generateApiKey(user.id, dto);
  }
}
