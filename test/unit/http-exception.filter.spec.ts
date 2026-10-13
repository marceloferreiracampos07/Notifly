import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArgumentsHost, HttpException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from '../../src/common/filters/HttpExceptionFilter.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let responseMock: any;
  let hostMock: ArgumentsHost;

  const createPrismaError = (code: string, meta?: Record<string, unknown>) =>
    new Prisma.PrismaClientKnownRequestError('Prisma error', {
      code,
      clientVersion: '6.19.3',
      meta,
    });

  beforeEach(() => {
    responseMock = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    hostMock = {
      switchToHttp: () => ({
        getResponse: () => responseMock,
        getRequest: () => ({ url: '/notificacoes' }),
      }),
    } as unknown as ArgumentsHost;

    filter = new AllExceptionsFilter();
  });

  it('deve responder com o status e a mensagem de uma HttpException', () => {
    filter.catch(new NotFoundException('Notificação não encontrada.'), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(404);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/notificacoes',
        message: 'Notificação não encontrada.',
      }),
    );
  });

  it('deve aceitar uma HttpException cujo corpo de resposta e uma string', () => {
    filter.catch(new HttpException('Estou virando um bule', 418), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(418);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Estou virando um bule' }),
    );
  });

  it('deve mapear violacao de unicidade do Prisma (P2002) para 409', () => {
    filter.catch(createPrismaError('P2002', { target: ['email'] }), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(409);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Já existe um registro com este(a) email.',
      }),
    );
  });

  it('deve mapear registro inexistente do Prisma (P2025) para 404', () => {
    filter.catch(createPrismaError('P2025'), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(404);
  });

  it('deve mapear falha de relacionamento do Prisma (P2003) para 400', () => {
    filter.catch(createPrismaError('P2003'), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(400);
  });

  it('deve mapear codigo Prisma desconhecido para 400 com o codigo na mensagem', () => {
    filter.catch(createPrismaError('P9999'), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(400);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Erro de banco de dados (Código Prisma: P9999)',
      }),
    );
  });

  it('deve tratar erro generico como 500 mantendo a mensagem original', () => {
    filter.catch(new Error('Falha inesperada'), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(500);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Falha inesperada' }),
    );
  });

  it('deve tratar excecao desconhecida como 500 com mensagem padrao', () => {
    filter.catch('algo estranho', hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(500);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erro interno no servidor' }),
    );
  });
});
