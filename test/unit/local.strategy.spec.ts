import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStrategy } from '../../src/modules/auth/strategies/local.strategy.js';

describe('LocalStrategy', () => {
  let authServiceMock: any;
  let strategy: LocalStrategy;

  beforeEach(() => {
    authServiceMock = {
      validateUser: vi.fn(),
    };

    strategy = new LocalStrategy(authServiceMock);
  });

  it('deve delegar a validacao de credenciais para o AuthService', async () => {
    const usuario = { id: 'user-1', email: 'cliente@teste.com' };
    authServiceMock.validateUser.mockResolvedValue(usuario);

    const result = await strategy.validate('cliente@teste.com', 'senha-123');

    expect(result).toEqual(usuario);
    expect(authServiceMock.validateUser).toHaveBeenCalledWith(
      'cliente@teste.com',
      'senha-123',
    );
  });
});
