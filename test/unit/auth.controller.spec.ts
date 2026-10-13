import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '../../src/modules/auth/controller/auth.controller.js';

describe('AuthController', () => {
  let authController: AuthController;
  let authServiceMock: any;
  let tokenServiceMock: any;
  let apiKeyServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      registerUser: vi.fn(),
    };

    tokenServiceMock = {
      generateTokens: vi.fn(),
      refreshTokens: vi.fn(),
    };

    apiKeyServiceMock = {
      generateApiKey: vi.fn(),
    };

    authController = new AuthController(
      authServiceMock,
      tokenServiceMock,
      apiKeyServiceMock,
    );
  });

  describe('login', () => {
    it('deve realizar login e retornar os tokens e a sessao do usuario', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      const tokens = { access_token: 'acc-1', refresh_token: 'ref-1' };
      tokenServiceMock.generateTokens.mockResolvedValue(tokens);

      const result = await authController.login(
        { email: 'test@example.com', password: '123' },
        user,
      );

      expect(result).toEqual({
        ...tokens,
        user,
      });
      expect(tokenServiceMock.generateTokens).toHaveBeenCalledWith(user);
    });
  });

  describe('register', () => {
    it('deve registrar usuario e retornar os dados junto aos tokens', async () => {
      const createdUser = { id: 'user-1', email: 'novo@teste.com' };
      const tokens = { access_token: 'acc-1', refresh_token: 'ref-1' };

      authServiceMock.registerUser.mockResolvedValue(createdUser);
      tokenServiceMock.generateTokens.mockResolvedValue(tokens);

      const result = await authController.register({
        email: 'novo@teste.com',
        password: 'password123',
      });

      expect(result).toEqual({
        user: createdUser,
        ...tokens,
      });
    });
  });

  describe('refresh', () => {
    it('deve renovar os tokens chamando o TokenService', async () => {
      const newTokens = { access_token: 'new-acc', refresh_token: 'new-ref' };
      tokenServiceMock.refreshTokens.mockResolvedValue(newTokens);

      const result = await authController.refresh({ refreshToken: 'valid-token' });

      expect(result).toEqual(newTokens);
      expect(tokenServiceMock.refreshTokens).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('createApiKey', () => {
    it('deve chamar o apiKeyService para gerar chave vinculada ao usuario logado', async () => {
      const user = { id: 'user-1', email: 'user@teste.com' };
      const createdKey = { apiKey: 'raw-key-123', message: 'Guarde com cuidado' };
      apiKeyServiceMock.generateApiKey.mockResolvedValue(createdKey);

      const result = await authController.createApiKey(user, { key: 'custom-key' });

      expect(result).toEqual(createdKey);
      expect(apiKeyServiceMock.generateApiKey).toHaveBeenCalledWith('user-1', {
        key: 'custom-key',
      });
    });
  });
});
