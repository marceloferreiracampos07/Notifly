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

    // 1. Validação da chave global do .env (sistema/admin)
    const validApiKey = this.configService.get<string>('API_KEY');
    if (validApiKey && apiKey.length === validApiKey.length) {
      const a = Buffer.from(apiKey);
      const b = Buffer.from(validApiKey);
      if (crypto.timingSafeEqual(a, b)) {
        // Opcional: Se for a chave global, você pode definir um usuário padrão ou system admin
        request.user = { id: 'system-admin' }; 
        return true;
      }
    }

    // 2. Validação da chave salva no banco vinculada a um usuário específico
    const dbApiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const dbApiKey = await this.prismaService.apiKey.findUnique({
      where: { key: dbApiKeyHash },
      include: { user: true }, // Traz os dados do usuário junto
    });

    if (!dbApiKey) {
      throw new UnauthorizedException('Chave de API inválida.');
    }

    // 💡 AQUI ESTÁ A CORREÇÃO: Anexamos o usuário no request
    request.user = {
      id: dbApiKey.userId,
      email: dbApiKey.user.email,
    };

    return true;
  }
}