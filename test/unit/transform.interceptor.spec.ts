import { describe, it, expect } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from '../../src/common/interceptors/TransformInterceptor.js';

describe('TransformInterceptor', () => {
  const createContext = (statusCode: number): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  it('deve envolver a resposta no formato { data, statusCode }', async () => {
    const interceptor = new TransformInterceptor();
    const next = { handle: () => of({ id: 'notif-1' }) };

    const result = await lastValueFrom(
      interceptor.intercept(createContext(201), next),
    );

    expect(result).toEqual({ data: { id: 'notif-1' }, statusCode: 201 });
  });
});
