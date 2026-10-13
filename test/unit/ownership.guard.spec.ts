import { describe, it, expect } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OwnershipGuard } from '../../src/common/guards/OwnershipGuard.js';
import { SYSTEM_ADMIN_ID } from '../../src/common/constants/auth.constants.js';

describe('OwnershipGuard', () => {
  const guard = new OwnershipGuard();

  const createContext = (
    user: { id: string; email: string } | undefined,
    targetId: string,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params: { id: targetId } }),
      }),
    }) as unknown as ExecutionContext;

  it('deve permitir quando o usuario acessar o proprio recurso', () => {
    const result = guard.canActivate(
      createContext({ id: 'user-1', email: 'user@teste.com' }, 'user-1'),
    );

    expect(result).toBe(true);
  });

  it('deve permitir quando o usuario for system-admin acessando outro recurso', () => {
    const result = guard.canActivate(
      createContext({ id: SYSTEM_ADMIN_ID, email: 'admin@system.local' }, 'user-2'),
    );

    expect(result).toBe(true);
  });

  it('deve lancar ForbiddenException quando um usuario comum acessar outro recurso', () => {
    expect(() =>
      guard.canActivate(createContext({ id: 'user-1', email: 'user@teste.com' }, 'user-2')),
    ).toThrow(ForbiddenException);
  });
});
