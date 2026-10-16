import { createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxPublisherService } from '../../src/modules/notification/service/outbox-publisher.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, waitFor, type RegisteredUser } from './helpers/http.js';
import { WebhookReceiver } from './helpers/webhook-receiver.js';

describe('Entrega de notificação E2E (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: RegisteredUser;
  let receiver: WebhookReceiver;
  let subscriptionId = '';

  beforeAll(async () => {
    receiver = new WebhookReceiver();
    const origin = await receiver.start();

    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    user = await registerUser(app, 'delivery@teste.com');

    const subscription = await request(app.getHttpServer())
      .post('/webhooks/subscription')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ url: `${origin}/webhook` })
      .expect(201);

    subscriptionId = subscription.body.data.id;
  });

  afterAll(async () => {
    await app?.close();
    await receiver.stop();
  });

  it('percorre outbox -> fila -> worker -> webhook assinado e marca a entrega como SUCCESS', async () => {
    const sendResponse = await request(app.getHttpServer())
      .post('/notifications/send')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        channel: 'EMAIL',
        recipient: 'cliente@teste.com',
        title: 'Notificação de teste',
        content: 'Conteúdo de teste',
      })
      .expect(202);

    const notificationId = sendResponse.body.data.notificationId as string;

    await app.get(OutboxPublisherService, { strict: false }).processEventOutbox();

    const processed = await waitFor(async () => {
      const response = await request(app.getHttpServer())
        .get(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${user.accessToken}`);
      return response.body.data.status === 'SENT' ? response.body.data : undefined;
    });
    expect(processed.status).toBe('SENT');

    const webhook = await waitFor(async () =>
      receiver.requests.find((entry) => entry.body.data?.notificationId === notificationId),
    );
    expect(webhook.body.event).toBe('notification.sent');
    expect(webhook.body.data?.status).toBe('SENT');

    const subscription = await prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscription) {
      throw new Error('Assinatura de webhook não encontrada.');
    }

    const expectedSignature = `sha256=${createHmac('sha256', subscription.secret)
      .update(webhook.rawBody)
      .digest('hex')}`;

    expect(webhook.headers['x-hub-signature-256']).toBe(expectedSignature);
    expect(webhook.headers['x-hub-signature-256']).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(webhook.headers['content-type']).toContain('application/json');

    const forgedSignature = `sha256=${createHmac('sha256', 'segredo-errado')
      .update(webhook.rawBody)
      .digest('hex')}`;
    expect(webhook.headers['x-hub-signature-256']).not.toBe(forgedSignature);

    const deliveries = await request(app.getHttpServer())
      .get('/webhooks/deliveries')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(deliveries.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subscriptionId,
          status: 'SUCCESS',
          attempts: 1,
        }),
      ]),
    );

    const outbox = await prisma.outboxEvent.findFirst({ where: { aggregateId: notificationId } });
    expect(outbox?.status).toBe('DISPATCHED');
  });
});
