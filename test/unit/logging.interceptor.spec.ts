import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { LoggingInterceptor } from '../../src/common/interceptors/LoggingInterceptor.js';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: any;

  const createContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/notificacoes',
          ip: '127.0.0.1',
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve registrar a requisicao e a resposta mantendo o valor original', async () => {
    const next = { handle: () => of({ ok: true }) };

    const result = await lastValueFrom(
      interceptor.intercept(createContext(), next),
    );

    expect(result).toEqual({ ok: true });
    expect(logSpy).toHaveBeenCalledWith('[REQ] GET /notificacoes - IP: 127.0.0.1');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RES] GET /notificacoes - Concluído em'),
    );
  });
});
