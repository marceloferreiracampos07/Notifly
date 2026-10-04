import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Erro interno no servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as any).message || exceptionResponse
          : exceptionResponse;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
     
      switch (exception.code) {
        case 'P2002': {
          
          status = HttpStatus.CONFLICT;
          const target = exception.meta?.target;
          message = `Já existe um registro com este(a) ${Array.isArray(target) ? target.join(', ') : 'dado'}.`;
          break;
        }
        case 'P2025': {
        
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado no banco de dados.';
          break;
        }
        case 'P2003': {
         
          status = HttpStatus.BAD_REQUEST;
          message = 'Falha de relacionamento: registro relacionado não existe.';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          message = `Erro de banco de dados (Código Prisma: ${exception.code})`;
          break;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}