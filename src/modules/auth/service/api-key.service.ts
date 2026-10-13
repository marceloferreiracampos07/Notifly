import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CreateApiKeyDto } from '../DTO/create-api-key.dto.js';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prismaService: PrismaService) {}

  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  async generateApiKey(userId: string, dto?: CreateApiKeyDto) {
    const rawKey = dto?.key || crypto.randomBytes(24).toString('hex');

    await this.prismaService.apiKey.create({
      data: {
        key: this.hashKey(rawKey),
        userId,
      },
    });

    return {
      apiKey: rawKey,
      message: 'Guarde esta chave de API em um local seguro. Ela não poderá ser exibida novamente.',
    };
  }

  async resolveUserByRawKey(rawKey: string): Promise<{ id: string; email: string } | null> {
    const apiKey = await this.prismaService.apiKey.findUnique({
      where: { key: this.hashKey(rawKey) },
      include: { user: true },
    });

    if (!apiKey) {
      return null;
    }

    return {
      id: apiKey.userId,
      email: apiKey.user.email,
    };
  }
}
