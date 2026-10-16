import { ClassSerializerInterceptor, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/common/filters/HttpExceptionFilter.js';
import { TransformInterceptor } from '../../../src/common/interceptors/TransformInterceptor.js';

export type ConfigureTestModule = (builder: TestingModuleBuilder) => TestingModuleBuilder;

/**
 * Sobe a aplicação com as mesmas configurações globais do `main.ts`
 * (pipes, filtros e interceptors), apontando para os containers da integração.
 * Permite customizar o módulo (ex.: `overrideProvider`) via `configure`.
 */
export async function createTestApp(configure?: ConfigureTestModule): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (configure ? configure(builder) : builder).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  await app.init();

  if (process.env.DISABLE_CRON === 'true') {
    const scheduler = app.get(SchedulerRegistry, { strict: false });
    for (const [name, job] of scheduler.getCronJobs()) {
      job.stop();
      scheduler.deleteCronJob(name);
    }
  }

  return app;
}
