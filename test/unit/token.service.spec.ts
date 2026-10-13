import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../../src/modules/auth/service/token.service.js';

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwtServiceMock: any;
  let configServiceMock: any;
  let usersServiceMock: any;

  beforeEach(() => {
    jwtServiceMock = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    };

    configServiceMock = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_EXPIRES_IN') return defaultValue || '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return defaultValue || '7d';
        return defaultValue;
      }),
    };

    usersServiceMock = {
      findOne: vi.fn(),
    };

    tokenService = new TokenService(
      jwtServiceMock,
      configServiceMock,
      usersServiceMock,
    );
  });

  describe('generateTokens', () => {
    it('deve gerar access_token e refresh_token com sucesso', async () => {
      jwtServiceMock.signAsync
        .mockResolvedValueOnce('mocked-access-token')
        .mockResolvedValueOnce('mocked-refresh-token');

      const tokens = await tokenService.generateTokens({
        id: 'user-1',
        email: 'test@example.com',
      });

      expect(tokens).toEqual({
        access_token: 'mocked-access-token',
        refresh_token: 'mocked-refresh-token',
      });
      expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshTokens', () => {
    it('deve rotacionar e emitir novos tokens quando o refresh token for valido', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'test@example.com',
        tokenType: 'refresh',
      });

      usersServiceMock.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await tokenService.refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
    });

    it('deve lancar UnauthorizedException quando o token for de tipo diferente de refresh', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'test@example.com',
        tokenType: 'access',
      });

      await expect(tokenService.refreshTokens('invalid-type-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lancar UnauthorizedException quando o usuario do refresh nao existir', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-removido',
        email: 'x@y.com',
        tokenType: 'refresh',
      });
      usersServiceMock.findOne.mockResolvedValue(null);

      await expect(tokenService.refreshTokens('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lancar UnauthorizedException quando o token for invalido ou expirado', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(tokenService.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
