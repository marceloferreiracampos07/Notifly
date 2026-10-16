import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';

describe('Autenticação (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const credentials = { email: 'auth-integration@teste.com', password: 'senha-secreta-123' };
  let accessToken = '';
  let refreshToken = '';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registra um usuário, nunca expõe a senha e devolve os tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    expect(response.body.data.user).toMatchObject({
      id: expect.any(String),
      email: credentials.email,
    });
    expect(response.body.data.user).not.toHaveProperty('password');
    expect(response.body.data.access_token).toEqual(expect.any(String));
    expect(response.body.data.refresh_token).toEqual(expect.any(String));

    accessToken = response.body.data.access_token;
    refreshToken = response.body.data.refresh_token;
  });

  it('rejeita o cadastro de um e-mail já existente com 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(409);

    expect(response.body.message).toMatch(/já está em uso/i);
  });

  it('autentica com credenciais válidas', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    expect(response.body.data.access_token).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe(credentials.email);
  });

  it('rejeita credenciais inválidas com 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'senha-errada' })
      .expect(401);
  });

  it('acessa uma rota protegida com o access token', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data.email).toBe(credentials.email);
  });

  it('bloqueia rota protegida sem token com 401', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('renova os tokens a partir do refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(response.body.data.access_token).toEqual(expect.any(String));
    expect(response.body.data.refresh_token).toEqual(expect.any(String));
  });

  it('gera uma API key e permite autenticar com ela', async () => {
    const rawKey = 'chave-de-integracao-123';

    const created = await request(app.getHttpServer())
      .post('/auth/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ key: rawKey })
      .expect(201);

    expect(created.body.data.apiKey).toBe(rawKey);

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('x-api-key', rawKey)
      .expect(200);

    expect(me.body.data.email).toBe(credentials.email);
  });
});
