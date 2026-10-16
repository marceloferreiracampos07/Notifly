import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutboxPublisherService } from '../../src/modules/notification/service/outbox-publisher.service.js';
import { WebhooksService } from '../../src/modules/webhooks/service/webhooks.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, waitFor, type RegisteredUser } from './helpers/http.js';
import { WebhookReceiver } from './helpers/webhook-receiver.js';

describe('Retry de entrega de webhook (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let webhooks: WebhooksService;
  let receiver: WebhookReceiver;
  let origin = '';
  let user: RegisteredUser;

  beforeAll(async () => {
    receiver = new WebhookReceiver();
    origin = await receiver.start();

    app = await createTestApp();
    prisma = app.get(PrismaService);
    webhooks = app.get(WebhooksService, { strict: false });
  });

  afterAll(async () => {
    await app?.close();
    await receiver.stop();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    user = await registerUser(app, 'retry@teste.com');
  });

  const subscribe = async (path: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/subscription')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ url: `${origin}${path}` })
      .expect(201);
    return response.body.data.id as string;
  };

  /** Envia uma notificação que gera uma entrega de webhook com falha (attempts = 1). */
  const createFailedDelivery = async (path: string): Promise<string> => {
    receiver.setResponder((url) => (url.endsWith(path) ? 500 : 200));
    const subscriptionId = await subscribe(path);

    await request(app.getHttpServer())
      .post('/notifications/send')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ channel: 'EMAIL', recipient: 'x@teste.com', title: 'T', content: 'C' })
      .expect(202);

    await app.get(OutboxPublisherService, { strict: false }).processEventOutbox();

    await waitFor(async () => {
      const delivery = await prisma.webhookDelivery.findFirst({
        where: { subscriptionId, status: 'FAILED' },
      });
      return delivery ?? undefined;
    });

    return subscriptionId;
  };

  it('reenvia uma entrega FAILED e atualiza a mesma linha para SUCCESS', async () => {
    const subscriptionId = await createFailedDelivery('/retry-ok');
    expect(receiver.countFor('/retry-ok')).toBe(1);

    receiver.setResponder(() => 200);
    await webhooks.retryFailedDeliveries();

    const delivery = await waitFor(async () => {
      const found = await prisma.webhookDelivery.findFirst({ where: { subscriptionId } });
      return found?.status === 'SUCCESS' ? found : undefined;
    });

    expect(delivery.attempts).toBe(2);
    expect(delivery.lastError).toBeNull();
    expect(receiver.countFor('/retry-ok')).toBe(2);

    const rows = await prisma.webhookDelivery.findMany({ where: { subscriptionId } });
    expect(rows).toHaveLength(1);
  });

  it('respeita o limite de 3 tentativas e para de reenviar', async () => {
    const subscriptionId = await createFailedDelivery('/retry-cap');

    await webhooks.retryFailedDeliveries();
    await webhooks.retryFailedDeliveries();

    const capped = await prisma.webhookDelivery.findFirst({ where: { subscriptionId } });
    expect(capped?.attempts).toBe(3);
    expect(capped?.status).toBe('FAILED');

    const requestsAtCap = receiver.countFor('/retry-cap');
    expect(requestsAtCap).toBe(3);

    await webhooks.retryFailedDeliveries();

    expect(receiver.countFor('/retry-cap')).toBe(requestsAtCap);
    const rows = await prisma.webhookDelivery.findMany({ where: { subscriptionId } });
    expect(rows).toHaveLength(1);
  });
});
