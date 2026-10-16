import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, type RegisteredUser } from './helpers/http.js';

describe('Notificações (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userA: RegisteredUser;
  let userB: RegisteredUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    userA = await registerUser(app, 'notifications-a@teste.com');
    userB = await registerUser(app, 'notifications-b@teste.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = (user: RegisteredUser) => ({ Authorization: `Bearer ${user.accessToken}` });

  const send = (user: RegisteredUser, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/notifications/send')
      .set(auth(user))
      .send({
        channel: 'EMAIL',
        recipient: 'destinatario@teste.com',
        title: 'Título',
        content: 'Conteúdo',
        ...body,
      });

  it('persiste a notificação e o evento de outbox de forma atômica (202)', async () => {
    const response = await send(userA).expect(202);

    expect(response.body.data).toMatchObject({
      success: true,
      notificationId: expect.any(String),
    });

    const notificationId = response.body.data.notificationId;

    const [notification, outbox] = await Promise.all([
      prisma.notification.findUnique({ where: { id: notificationId } }),
      prisma.outboxEvent.findFirst({ where: { aggregateId: notificationId } }),
    ]);

    expect(notification).toMatchObject({
      status: 'QUEUED',
      channel: 'EMAIL',
      userId: userA.userId,
    });
    expect(outbox).toMatchObject({
      aggregateType: 'Notification',
      type: 'send-notification',
      status: 'PENDING',
    });
  });

  it('rejeita payload com canal inválido com 400', async () => {
    const response = await send(userA, { channel: 'WHATSAPP' }).expect(400);
    expect(JSON.stringify(response.body.message)).toContain('channel');
  });

  it('rejeita payload sem campos obrigatórios com 400', async () => {
    await request(app.getHttpServer())
      .post('/notifications/send')
      .set(auth(userA))
      .send({ channel: 'EMAIL' })
      .expect(400);
  });

  it('lista as notificações do usuário com paginação', async () => {
    await send(userA, { channel: 'SMS' }).expect(202);
    await send(userA, { channel: 'PUSH' }).expect(202);

    const response = await request(app.getHttpServer())
      .get('/notifications?page=1&limit=2')
      .set(auth(userA))
      .expect(200);

    const { data, meta } = response.body.data;
    expect(data.length).toBeLessThanOrEqual(2);
    expect(meta).toMatchObject({ page: 1, limit: 2, total: expect.any(Number) });
    expect(meta.totalPages).toBe(Math.ceil(meta.total / 2));
  });

  it('filtra as notificações por canal', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications?channel=PUSH')
      .set(auth(userA))
      .expect(200);

    const { data, meta } = response.body.data;
    expect(meta.total).toBeGreaterThanOrEqual(1);
    expect(data.every((item: { channel: string }) => item.channel === 'PUSH')).toBe(true);
  });

  it('filtra as notificações por intervalo de datas', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const none = await request(app.getHttpServer())
      .get(`/notifications?startDate=${future}`)
      .set(auth(userA))
      .expect(200);
    expect(none.body.data.meta.total).toBe(0);

    const range = await request(app.getHttpServer())
      .get(`/notifications?startDate=${past}&endDate=${future}`)
      .set(auth(userA))
      .expect(200);
    expect(range.body.data.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('isola as notificações entre usuários (404 para quem não é dono)', async () => {
    const created = await send(userB, { recipient: 'user-b@teste.com' }).expect(202);
    const notificationId = created.body.data.notificationId;

    await request(app.getHttpServer())
      .get(`/notifications/${notificationId}`)
      .set(auth(userA))
      .expect(404);

    const asOwner = await request(app.getHttpServer())
      .get(`/notifications/${notificationId}`)
      .set(auth(userB))
      .expect(200);

    expect(asOwner.body.data.id).toBe(notificationId);
  });
});
