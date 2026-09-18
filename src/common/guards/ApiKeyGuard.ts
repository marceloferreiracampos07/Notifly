import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    // 1. Valida se a chave foi enviada no cabeçalho
    if (!apiKey) {
      throw new UnauthorizedException('A chave de API não foi fornecida.');
    }

    // 2. Busca a chave correta salva no seu arquivo .env
    const validApiKey = this.configService.get<string>('API_KEY');

    // 3. Compara se a chave enviada é idêntica à do ambiente
    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('Chave de API inválida.');
    }

    return true;
  }
}