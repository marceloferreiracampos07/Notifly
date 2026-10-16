import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface RegisteredUser {
  userId: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(
  app: INestApplication,
  email: string,
  password = 'senha-secreta-123',
): Promise<RegisteredUser> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password })
    .expect(201);

  return {
    userId: response.body.data.user.id,
    email,
    password,
    accessToken: response.body.data.access_token,
    refreshToken: response.body.data.refresh_token,
  };
}

/** Aguarda uma condição assíncrona (fluxo outbox -> fila -> worker -> webhook). */
export async function waitFor<T>(
  assertion: () => Promise<T | undefined>,
  { timeoutMs = 20000, intervalMs = 250 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await assertion();
    if (result !== undefined) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condição não satisfeita dentro de ${timeoutMs}ms.`);
}
