import {Injectable, NestInterceptor,ExecutionContext,CallHandler, Logger,} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {

  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
   
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();


    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(` requisição:  ${method} ${url} - IP: ${ip}`);


    return next.handle().pipe(
      tap((responseData) => {
        const elapsedTime = Date.now() - startTime;

        
        this.logger.log(
          `[RES] ${method} ${url} - Concluído em ${elapsedTime}ms`,
          {
            method,
            url,
            ip,
            userAgent,
            duration: `${elapsedTime}ms`,
            body: responseData 
          },
        );
      }),
    );
  }
}