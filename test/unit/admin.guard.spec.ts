import { describe, it, expect } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from '../../src/common/guards/AdminGuard.js';
import { SYSTEM_ADMIN_ID } from '../../src/common/constants/auth.constants.js';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  const createContext = (user?: { id: string; email: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('deve permitir o acesso quando o usuario for system-admin', () => {
    const result = guard.canActivate(
      createContext({ id: SYSTEM_ADMIN_ID, email: 'admin@system.local' }),
    );

    expect(result).toBe(true);
  });

  it('deve lancar ForbiddenException quando o usuario nao for admin', () => {
    expect(() =>
      guard.canActivate(createContext({ id: 'user-1', email: 'user@teste.com' })),
    ).toThrow(ForbiddenException);
  });

  it('deve lancar ForbiddenException quando nao houver usuario autenticado', () => {
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
