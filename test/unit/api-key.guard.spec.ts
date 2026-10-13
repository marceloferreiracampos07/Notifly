import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from '../../src/common/guards/ApiKeyGuard.js';
import { SYSTEM_ADMIN_ID } from '../../src/common/constants/auth.constants.js';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configServiceMock: any;
  let apiKeyServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn(),
    };

    apiKeyServiceMock = {
      resolveUserByRawKey: vi.fn(),
    };

    guard = new ApiKeyGuard(configServiceMock, apiKeyServiceMock);
  });

  const createMockContext = (headers: Record<string, string> = {}): { context: ExecutionContext; request: any } => {
    const request: any = { headers };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('deve lancar UnauthorizedException quando o header x-api-key nao for fornecido', async () => {
    const { context } = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('deve autenticar como system-admin quando a chave for identica a chave global de sistema', async () => {
    configServiceMock.get.mockReturnValue('chave-secreta-sistema-global');
    const { context, request } = createMockContext({
      'x-api-key': 'chave-secreta-sistema-global',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ id: SYSTEM_ADMIN_ID });
    expect(apiKeyServiceMock.resolveUserByRawKey).not.toHaveBeenCalled();
  });

  it('deve autenticar o usuario resolvido pelo ApiKeyService a partir da chave', async () => {
    configServiceMock.get.mockReturnValue('chave-diferente');
    apiKeyServiceMock.resolveUserByRawKey.mockResolvedValue({
      id: 'user-1',
      email: 'cliente@teste.com',
    });

    const { context, request } = createMockContext({
      'x-api-key': 'chave-do-usuario-123',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'cliente@teste.com' });
    expect(apiKeyServiceMock.resolveUserByRawKey).toHaveBeenCalledWith(
      'chave-do-usuario-123',
    );
  });

  it('deve lancar UnauthorizedException se a chave nao existir no banco', async () => {
    configServiceMock.get.mockReturnValue('chave-diferente');
    apiKeyServiceMock.resolveUserByRawKey.mockResolvedValue(null);

    const { context } = createMockContext({
      'x-api-key': 'chave-inexistente',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
