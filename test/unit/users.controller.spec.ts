import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from '../../src/modules/users/users.controller.js';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersServiceMock: any;

  beforeEach(() => {
    usersServiceMock = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    usersController = new UsersController(usersServiceMock);
  });

  it('deve criar o usuario delegando para o UsersService', async () => {
    const dto = { email: 'novo@teste.com', password: 'password123' };
    usersServiceMock.create.mockResolvedValue({ id: 'user-1' });

    const result = await usersController.create(dto);

    expect(result).toEqual({ id: 'user-1' });
    expect(usersServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('deve buscar os dados do usuario logado atraves da sua sessao', async () => {
    const currentUser = { id: 'user-1', email: 'me@teste.com' };
    usersServiceMock.findOne.mockResolvedValue({ id: 'user-1', email: 'me@teste.com' });

    const result = await usersController.findMe(currentUser);

    expect(result).toEqual({ id: 'user-1', email: 'me@teste.com' });
    expect(usersServiceMock.findOne).toHaveBeenCalledWith('user-1');
  });

  it('deve listar todos os usuarios', async () => {
    usersServiceMock.findAll.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

    const result = await usersController.findAll();

    expect(result).toHaveLength(2);
    expect(usersServiceMock.findAll).toHaveBeenCalledOnce();
  });

  it('deve buscar um usuario pelo id do parametro', async () => {
    usersServiceMock.findOne.mockResolvedValue({ id: 'user-2' });

    const result = await usersController.findOne('user-2');

    expect(result).toEqual({ id: 'user-2' });
    expect(usersServiceMock.findOne).toHaveBeenCalledWith('user-2');
  });

  it('deve atualizar um usuario pelo id do parametro', async () => {
    const dto = { email: 'atualizado@teste.com' };
    usersServiceMock.update.mockResolvedValue({ id: 'user-2' });

    const result = await usersController.update('user-2', dto);

    expect(result).toEqual({ id: 'user-2' });
    expect(usersServiceMock.update).toHaveBeenCalledWith('user-2', dto);
  });

  it('deve remover um usuario pelo id do parametro', async () => {
    usersServiceMock.remove.mockResolvedValue({ message: 'Usuário removido com sucesso.' });

    const result = await usersController.remove('user-2');

    expect(result).toEqual({ message: 'Usuário removido com sucesso.' });
    expect(usersServiceMock.remove).toHaveBeenCalledWith('user-2');
  });
});
