import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaMock: any;
  let passwordHasherMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    passwordHasherMock = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
      compare: vi.fn(),
    };

    usersService = new UsersService(prismaMock, passwordHasherMock);
  });

  describe('create', () => {
    it('deve criar um usuario com senha hasheada e sem retornar a senha no objeto', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'user-1',
          email: data.email,
          password: data.password,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await usersService.create({
        email: 'novo@example.com',
        password: 'password123',
      });

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('novo@example.com');
      expect((result as any).password).toBeUndefined();
      expect(passwordHasherMock.hash).toHaveBeenCalledWith('password123');
    });

    it('deve lancar ConflictException se o email ja estiver cadastrado', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-existing',
        email: 'existente@example.com',
      });

      await expect(
        usersService.create({
          email: 'existente@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar o usuario (com senha) pelo email', async () => {
      const user = { id: 'user-1', email: 'x@y.com', password: 'hashed' };
      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await usersService.findByEmail('x@y.com');

      expect(result).toEqual(user);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'x@y.com' },
      });
    });
  });

  describe('findAll', () => {
    it('deve listar os usuarios sem expor a senha', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'user-1', email: 'x@y.com' }]);

      const result = await usersService.findAll();

      expect(result).toHaveLength(1);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        select: { id: true, email: true, createdAt: true, updatedAt: true },
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar o usuario caso ele exista', async () => {
      const user = {
        id: 'user-1',
        email: 'teste@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await usersService.findOne('user-1');
      expect(result).toEqual(user);
    });

    it('deve lancar NotFoundException se o usuario nao for encontrado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(usersService.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar os dados do usuario com sucesso', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      prismaMock.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'atualizado@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usersService.update('user-1', {
        email: 'atualizado@example.com',
      });

      expect(result.email).toBe('atualizado@example.com');
    });

    it('deve hashear a nova senha ao atualizar', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      prismaMock.user.update.mockResolvedValue({ id: 'user-1' });

      await usersService.update('user-1', { password: 'nova-senha' });

      expect(passwordHasherMock.hash).toHaveBeenCalledWith('nova-senha');
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { password: 'hashed-password' },
        }),
      );
    });

    it('deve lancar ConflictException ao tentar atualizar para email pertencente a outro usuario', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({ id: 'outro-user', email: 'ocupado@example.com' });

      await expect(
        usersService.update('user-1', { email: 'ocupado@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deve remover o usuario com sucesso', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.user.delete.mockResolvedValue({ id: 'user-1' });

      const result = await usersService.remove('user-1');

      expect(result).toEqual({ message: 'Usuário removido com sucesso.' });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
