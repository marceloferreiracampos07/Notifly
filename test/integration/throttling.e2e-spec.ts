import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser } from './helpers/http.js';

describe('Rate limiting (integração)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await registerUser(app, 'throttling@teste.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('bloqueia o login após 5 tentativas no mesmo minuto (429)', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'throttling@teste.com', password: 'senha-errada' });

    for (let i = 0; i < 5; i += 1) {
      const response = await attempt();
      expect(response.status).toBe(401);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
  });
});
