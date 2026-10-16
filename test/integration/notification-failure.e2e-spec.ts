import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NotificationSender } from '../../src/modules/Queues/notification-sender.service.js';
import { OutboxPublisherService } from '../../src/modules/notification/service/outbox-publisher.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, waitFor, type RegisteredUser } from './helpers/http.js';
import { WebhookReceiver } from './helpers/webhook-receiver.js';

describe('Retry do job e falha definitiva (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let receiver: WebhookReceiver;
  let user: RegisteredUser;
  const send = vi.fn().mockRejectedValue(new Error('provedor indisponível'));

  beforeAll(async () => {
    receiver = new WebhookReceiver();
    const origin = await receiver.start();

    app = await createTestApp((builder) =>
      builder.overrideProvider(NotificationSender).useValue({ send }),
    );
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    user = await registerUser(app, 'failure@teste.com');

    await request(app.getHttpServer())
      .post('/webhooks/subscription')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ url: `${origin}/hook` })
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
    await receiver.stop();
  });

  it('tenta 3 vezes, marca a notificação como FAILED e dispara notification.failed', async () => {
    const sent = await request(app.getHttpServer())
      .post('/notifications/send')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ channel: 'SMS', recipient: '+5511999999999', title: 'T', content: 'C' })
      .expect(202);

    const notificationId = sent.body.data.notificationId as string;
    await app.get(OutboxPublisherService, { strict: false }).processEventOutbox();

    const failed = await waitFor(async () => {
      const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
      return notification?.status === 'FAILED' ? notification : undefined;
    });

    expect(failed.status).toBe('FAILED');
    expect(send).toHaveBeenCalledTimes(3);

    const webhook = await waitFor(async () =>
      receiver.requests.find(
        (entry) =>
          entry.body.event === 'notification.failed' &&
          entry.body.data?.notificationId === notificationId,
      ),
    );
    expect(webhook.body.data?.status).toBe('FAILED');
    expect(webhook.body.data?.error).toContain('provedor indisponível');

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId } });
    expect(notifications).toHaveLength(1);
  });
});
