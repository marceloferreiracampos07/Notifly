import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxPublisherService } from '../../src/modules/notification/service/outbox-publisher.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';

describe('Caminho de falha do outbox (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let publisher: OutboxPublisherService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    publisher = app.get(OutboxPublisherService, { strict: false });
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('marca como FAILED um evento cujo payload não pode ser desserializado', async () => {
    const event = await prisma.outboxEvent.create({
      data: {
        aggregateType: 'Notification',
        aggregateId: 'payload-invalido',
        type: 'send-notification',
        payload: '{isto-nao-e-um-json',
        status: 'PENDING',
      },
    });

    await publisher.processEventOutbox();

    const updated = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(updated?.status).toBe('FAILED');
  });
});
