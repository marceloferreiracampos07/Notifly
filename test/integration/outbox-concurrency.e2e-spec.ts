import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxPublisherService } from '../../src/modules/notification/service/outbox-publisher.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, waitFor, type RegisteredUser } from './helpers/http.js';
import { WebhookReceiver } from './helpers/webhook-receiver.js';

describe('Concorrência do publisher (integração)', () => {
  let appA: INestApplication;
  let appB: INestApplication;
  let prisma: PrismaService;
  let publisherA: OutboxPublisherService;
  let publisherB: OutboxPublisherService;
  let receiver: WebhookReceiver;
  let user: RegisteredUser;

  beforeAll(async () => {
    receiver = new WebhookReceiver();
    const origin = await receiver.start();

    appA = await createTestApp();
    appB = await createTestApp();

    prisma = appA.get(PrismaService);
    publisherA = appA.get(OutboxPublisherService, { strict: false });
    publisherB = appB.get(OutboxPublisherService, { strict: false });

    await resetDatabase(prisma);
    user = await registerUser(appA, 'concurrency@teste.com');

    await request(appA.getHttpServer())
      .post('/webhooks/subscription')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ url: `${origin}/hook` })
      .expect(201);
  });

  afterAll(async () => {
    await appA?.close();
    await appB?.close();
    await receiver.stop();
  });

  it('não entrega em duplicidade quando duas instâncias despacham o mesmo evento', async () => {
    const sent = await request(appA.getHttpServer())
      .post('/notifications/send')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ channel: 'EMAIL', recipient: 'x@teste.com', title: 'T', content: 'C' })
      .expect(202);

    const notificationId = sent.body.data.notificationId as string;

    await Promise.all([publisherA.processEventOutbox(), publisherB.processEventOutbox()]);

    await waitFor(async () =>
      receiver.requests.find((entry) => entry.body.data?.notificationId === notificationId),
    );

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const delivered = receiver.requests.filter(
      (entry) => entry.body.data?.notificationId === notificationId,
    );
    expect(delivered).toHaveLength(1);

    expect(await prisma.notification.count({ where: { userId: user.userId } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: notificationId } })).toBe(1);
  });
});
