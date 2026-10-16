import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, type RegisteredUser } from './helpers/http.js';

describe('Refresh token (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let user: RegisteredUser;
  let otherUser: RegisteredUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    await resetDatabase(prisma);

    user = await registerUser(app, 'refresh@teste.com');
    otherUser = await registerUser(app, 'refresh-other@teste.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  const refresh = (refreshToken: string) =>
    request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });

  it('renova e devolve um access token do mesmo sub', async () => {
    const response = await refresh(user.refreshToken).expect(200);

    const payload = await jwt.verifyAsync<{ sub: string }>(response.body.data.access_token, {
      secret: process.env.JWT_SECRET,
    });
    expect(payload.sub).toBe(user.userId);
  });

  it('rejeita um access token usado como refresh (401)', async () => {
    await refresh(user.accessToken).expect(401);
  });

  it('rejeita um refresh token malformado (401)', async () => {
    await refresh('nao.e.um.jwt').expect(401);
  });

  it('rejeita um refresh token expirado (401)', async () => {
    const expired = await jwt.signAsync(
      { sub: user.userId, email: user.email, tokenType: 'refresh' },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '-1s' },
    );

    await refresh(expired).expect(401);
  });

  it('um refresh token é uma credencial do próprio sub (emite tokens do dono)', async () => {
    const response = await refresh(otherUser.refreshToken).expect(200);

    const payload = await jwt.verifyAsync<{ sub: string }>(response.body.data.access_token, {
      secret: process.env.JWT_SECRET,
    });
    expect(payload.sub).toBe(otherUser.userId);
  });
});
