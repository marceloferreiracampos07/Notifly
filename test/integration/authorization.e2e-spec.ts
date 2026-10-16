import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, type RegisteredUser } from './helpers/http.js';

describe('Autorização e validação (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userA: RegisteredUser;
  let userB: RegisteredUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    userA = await registerUser(app, 'authorization-a@teste.com');
    userB = await registerUser(app, 'authorization-b@teste.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = (user: RegisteredUser) => ({ Authorization: `Bearer ${user.accessToken}` });

  it('nega a listagem de usuários para usuário comum (403)', async () => {
    await request(app.getHttpServer()).get('/users').set(auth(userA)).expect(403);
  });

  it('permite a listagem de usuários com a API key de sistema (admin)', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('x-api-key', process.env.API_KEY ?? '')
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('rejeita uma API key inválida (401)', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-api-key', 'chave-inexistente')
      .expect(401);
  });

  it('impede acessar os dados de outro usuário (OwnershipGuard 403)', async () => {
    await request(app.getHttpServer())
      .get(`/users/${userB.userId}`)
      .set(auth(userA))
      .expect(403);
  });

  it('permite acessar os próprios dados', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${userA.userId}`)
      .set(auth(userA))
      .expect(200);

    expect(response.body.data.id).toBe(userA.userId);
  });

  it('impede atualizar outro usuário (403) e permite o próprio (200)', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${userB.userId}`)
      .set(auth(userA))
      .send({ email: 'invasor@teste.com' })
      .expect(403);

    const updated = await request(app.getHttpServer())
      .patch(`/users/${userA.userId}`)
      .set(auth(userA))
      .send({ email: 'authorization-a-novo@teste.com' })
      .expect(200);

    expect(updated.body.data.email).toBe('authorization-a-novo@teste.com');
  });

  it('valida a URL da assinatura de webhook (400)', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/subscription')
      .set(auth(userA))
      .send({ url: 'nao-e-uma-url' })
      .expect(400);
  });
});
