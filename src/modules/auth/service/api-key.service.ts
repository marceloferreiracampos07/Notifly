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
    const rawKey = dto?.key || crypto.randomBytes(24).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    await this.prismaService.apiKey.create({
      data: {
        key: hashedKey,
        userId,
      },
    });

    return {
      apiKey: rawKey,
      message: 'Guarde esta chave de API em um local seguro. Ela não poderá ser exibida novamente.',
    };
  }

  getSystemApiKey() {
    const apiKey = this.configService.get<string>('API_KEY');
    return {
      apiKey,
      message: 'API Key obtida com sucesso.',
    };
  }
}
