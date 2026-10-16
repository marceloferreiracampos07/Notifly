import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';
import type { Queue } from 'bullmq';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QUEUE_CONSTANTS } from '../../src/modules/Queues/queue.constants.js';
import { OutboxPublisherService } from '../../src/modules/notification/service/outbox-publisher.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, waitFor, type RegisteredUser } from './helpers/http.js';
import { WebhookReceiver } from './helpers/webhook-receiver.js';

describe('Idempotência do despacho da outbox (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let publisher: OutboxPublisherService;
  let queue: Queue;
  let receiver: WebhookReceiver;
  let user: RegisteredUser;
  let otherUser: RegisteredUser;

  beforeAll(async () => {
    receiver = new WebhookReceiver();
    const origin = await receiver.start();

    app = await createTestApp();
    prisma = app.get(PrismaService);
    publisher = app.get(OutboxPublisherService, { strict: false });
    queue = app.get<Queue>(getQueueToken(QUEUE_CONSTANTS.NOTIFICATIONS));

    await resetDatabase(prisma);
    user = await registerUser(app, 'idempotency@teste.com');
    otherUser = await registerUser(app, 'idempotency-other@teste.com');

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

  it('não reprocessa um evento já despachado mesmo com o jobId recriado', async () => {
    const sent = await request(app.getHttpServer())
      .post('/notifications/send')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ channel: 'EMAIL', recipient: 'x@teste.com', title: 'T', content: 'C' })
      .expect(202);

    const notificationId = sent.body.data.notificationId as string;
    await publisher.processEventOutbox();

    await waitFor(async () =>
      receiver.requests.find((entry) => entry.body.data?.notificationId === notificationId),
    );

    const event = await prisma.outboxEvent.findFirstOrThrow({ where: { aggregateId: notificationId } });
    expect(event.status).toBe('DISPATCHED');

    // Simula uma queda logo após enfileirar: o evento volta a PENDING e é reprocessado.
    await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PENDING' } });
    await publisher.processEventOutbox();

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const delivered = receiver.requests.filter(
      (entry) => entry.body.data?.notificationId === notificationId,
    );
    expect(delivered).toHaveLength(1);

    const eventAfter = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(eventAfter.status).toBe('DISPATCHED');

    expect(await prisma.notification.count({ where: { userId: user.userId } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: notificationId } })).toBe(1);

    // O jobId é o id do evento, então o job permanece único na fila.
    expect(await queue.getJob(event.id)).toBeTruthy();
  });

  it('isola as entregas de webhook entre usuários', async () => {
    const mine = await request(app.getHttpServer())
      .get('/webhooks/deliveries')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);
    expect(mine.body.data.length).toBeGreaterThanOrEqual(1);

    const others = await request(app.getHttpServer())
      .get('/webhooks/deliveries')
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .expect(200);
    expect(others.body.data).toHaveLength(0);
  });
});
