import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { ApiKeyService } from '../../src/modules/auth/service/api-key.service.js';

describe('ApiKeyService', () => {
  let apiKeyService: ApiKeyService;
  let prismaMock: any;

  const hash = (value: string) =>
    crypto.createHash('sha256').update(value).digest('hex');

  beforeEach(() => {
    prismaMock = {
      apiKey: {
        create: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    apiKeyService = new ApiKeyService(prismaMock);
  });

  describe('generateApiKey', () => {
    it('deve gerar uma api key aleatoria e salvar apenas o hash no banco', async () => {
      prismaMock.apiKey.create.mockResolvedValue({ id: 'key-1' });

      const result = await apiKeyService.generateApiKey('user-1');

      expect(result.apiKey).toBeDefined();
      expect(result.apiKey).toHaveLength(48);
      expect(prismaMock.apiKey.create).toHaveBeenCalledWith({
        data: {
          key: hash(result.apiKey),
          userId: 'user-1',
        },
      });
    });

    it('deve permitir salvar uma chave customizada fornecida no DTO', async () => {
      prismaMock.apiKey.create.mockResolvedValue({ id: 'key-1' });

      const result = await apiKeyService.generateApiKey('user-1', {
        key: 'minha-chave-customizada',
      });

      expect(result.apiKey).toBe('minha-chave-customizada');
    });
  });

  describe('resolveUserByRawKey', () => {
    it('deve resolver o usuario a partir do hash da chave informada', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
        user: { email: 'cliente@teste.com' },
      });

      const result = await apiKeyService.resolveUserByRawKey('chave-do-usuario');

      expect(result).toEqual({ id: 'user-1', email: 'cliente@teste.com' });
      expect(prismaMock.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key: hash('chave-do-usuario') },
        include: { user: true },
      });
    });

    it('deve retornar null quando a chave nao existir no banco', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      const result = await apiKeyService.resolveUserByRawKey('chave-inexistente');

      expect(result).toBeNull();
    });
  });
});
