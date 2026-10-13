import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyService } from '../../modules/auth/service/api-key.service.js';
import { SYSTEM_ADMIN_ID } from '../constants/auth.constants.js';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('A chave de API não foi fornecida.');
    }

    const validApiKey = this.configService.get<string>('API_KEY');

    if (validApiKey && apiKey.length === validApiKey.length) {
      const a = Buffer.from(apiKey);
      const b = Buffer.from(validApiKey);
      if (crypto.timingSafeEqual(a, b)) {
        request.user = { id: SYSTEM_ADMIN_ID };
        return true;
      }
    }

    const user = await this.apiKeyService.resolveUserByRawKey(apiKey);

    if (!user) {
      throw new UnauthorizedException('Chave de API inválida.');
    }

    request.user = user;

    return true;
  }
}
