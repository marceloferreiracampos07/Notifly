import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy.js';

describe('JwtStrategy', () => {
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn().mockReturnValue('segredo-jwt-de-teste'),
    };
  });

  it('deve lancar erro ao iniciar quando JWT_SECRET nao estiver definido', () => {
    configServiceMock.get.mockReturnValue(undefined);

    expect(() => new JwtStrategy(configServiceMock)).toThrow(/JWT_SECRET/);
  });

  it('deve montar a sessao do usuario a partir do payload do token', async () => {
    const strategy = new JwtStrategy(configServiceMock);

    const session = await strategy.validate({
      sub: 'user-1',
      email: 'cliente@teste.com',
    });

    expect(session).toEqual({ id: 'user-1', email: 'cliente@teste.com' });
  });
});
