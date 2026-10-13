import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/service/auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let usersServiceMock: any;
  let passwordHasherMock: any;

  beforeEach(() => {
    usersServiceMock = {
      create: vi.fn(),
      findByEmail: vi.fn(),
    };

    passwordHasherMock = {
      hash: vi.fn(),
      compare: vi.fn(),
    };

    authService = new AuthService(usersServiceMock, passwordHasherMock);
  });

  describe('registerUser', () => {
    it('deve delegar a criacao do usuario para o UsersService', async () => {
      const createdUser = { id: 'user-1', email: 'novo@teste.com' };
      usersServiceMock.create.mockResolvedValue(createdUser);

      const result = await authService.registerUser({
        email: 'novo@teste.com',
        password: 'password123',
      });

      expect(result).toEqual(createdUser);
      expect(usersServiceMock.create).toHaveBeenCalledWith({
        email: 'novo@teste.com',
        password: 'password123',
      });
    });
  });

  describe('validateUser', () => {
    it('deve retornar a sessao do usuario quando as credenciais forem validas', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
      });
      passwordHasherMock.compare.mockResolvedValue(true);

      const result = await authService.validateUser('test@example.com', 'secret123');

      expect(result).toEqual({ id: 'user-1', email: 'test@example.com' });
      expect(passwordHasherMock.compare).toHaveBeenCalledWith(
        'secret123',
        'hashed-password',
      );
    });

    it('deve lancar UnauthorizedException quando o email nao for encontrado', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateUser('notfound@example.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lancar UnauthorizedException quando a senha estiver incorreta', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
      });
      passwordHasherMock.compare.mockResolvedValue(false);

      await expect(
        authService.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
