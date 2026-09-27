import { Controller, Post, UseGuards, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { AuthService } from '../service/auth.service.js';
import { ApiKeyService } from '../service/api-key.service.js';
import { LocalAuthGuard } from '../../../common/guards/local-auth.guard.js';
import { ApiKeyGuard } from '../../../common/guards/ApiKeyGuard.js';
import { CreateAuthDto } from '../../DTO/register.dto.js';
import { LoginDto } from '../../DTO/login.dto.js';
import { CreateApiKeyDto } from '../../DTO/create-api-key.dto.js';
import type { UserSession } from '../../interface_user/user-session.interface.js';
import { CurrentUser } from '../../../common/decorators/get-user-decorator.js';
import { Public } from '../../../common/decorators/public-decorator.js';
import { JwtAuthGuard } from '../../../common/guards/JwtAuthGuard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @CurrentUser() user: UserSession) {
    const tokenData = await this.authService.generateJwtToken(user);
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
    const tokenData = await this.authService.generateJwtToken(user);

    return {
      user,
      ...tokenData,
    };
  }

  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @Post('api-keys/system')
  async getApiKey() {
    return this.apiKeyService.getSystemApiKey();
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('api-keys')
  async createApiKey(@CurrentUser() user: UserSession, @Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.generateApiKey(user.id, dto);
  }
}
