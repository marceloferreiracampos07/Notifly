import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
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
        return true;
      }
    }

    const dbApiKey = await this.prismaService.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!dbApiKey) {
      throw new UnauthorizedException('Chave de API inválida.');
    }

    return true;
  }
}