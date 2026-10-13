import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtAuthGuard } from '../../src/common/guards/JwtAuthGuard.js';
import { ExecutionContext } from '@nestjs/common';

describe('JwtAuthGuard (Unified Auth Guard)', () => {
  let jwtAuthGuard: JwtAuthGuard;
  let reflectorMock: any;
  let apiKeyGuardMock: any;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: vi.fn(),
    };

    apiKeyGuardMock = {
      canActivate: vi.fn(),
    };

    jwtAuthGuard = new JwtAuthGuard(reflectorMock, apiKeyGuardMock);
  });

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('deve liberar o acesso imediatamente se a rota possuir o decorator @Public', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    const result = await jwtAuthGuard.canActivate(context);

    expect(result).toBe(true);
    expect(apiKeyGuardMock.canActivate).not.toHaveBeenCalled();
  });

  it('deve delegar a autenticacao para o ApiKeyGuard quando o header x-api-key estiver presente', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    apiKeyGuardMock.canActivate.mockResolvedValue(true);
    const context = createMockContext({ 'x-api-key': 'minha-chave-api' });

    const result = await jwtAuthGuard.canActivate(context);

    expect(result).toBe(true);
    expect(apiKeyGuardMock.canActivate).toHaveBeenCalledWith(context);
  });
});
