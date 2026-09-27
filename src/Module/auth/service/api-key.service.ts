import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CreateApiKeyDto } from '../../DTO/create-api-key.dto.js';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateApiKey(userId: string, dto?: CreateApiKeyDto) {
    const key = dto?.key || crypto.randomBytes(24).toString('hex');
    return this.prismaService.apiKey.create({
      data: {
        key,
        userId,
      },
    });
  }

  getSystemApiKey() {
    const apiKey = this.configService.get<string>('API_KEY');
    return {
      apiKey,
      message: 'API Key obtida com sucesso.',
    };
  }
}
