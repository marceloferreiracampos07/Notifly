import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MaintenanceService } from '../../src/modules/maintenance/maintenance.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './helpers/create-test-app.js';
import { resetDatabase } from './helpers/database.js';
import { registerUser, type RegisteredUser } from './helpers/http.js';

const FORTY_DAYS_IN_MS = 40 * 24 * 60 * 60 * 1000;

describe('Limpeza de dados antigos (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let maintenance: MaintenanceService;
  let user: RegisteredUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    maintenance = app.get(MaintenanceService, { strict: false });
    await resetDatabase(prisma);
    user = await registerUser(app, 'maintenance@teste.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('remove outbox DISPATCHED e entregas antigas, preservando os recentes e pendentes', async () => {
    const oldDate = new Date(Date.now() - FORTY_DAYS_IN_MS);
    const baseEvent = { aggregateType: 'Notification', type: 'send-notification', payload: {} };

    const oldDispatched = await prisma.outboxEvent.create({
      data: { ...baseEvent, aggregateId: 'old-dispatched', status: 'DISPATCHED', createdAt: oldDate },
    });
    const oldPending = await prisma.outboxEvent.create({
      data: { ...baseEvent, aggregateId: 'old-pending', status: 'PENDING', createdAt: oldDate },
    });
    const recentDispatched = await prisma.outboxEvent.create({
      data: { ...baseEvent, aggregateId: 'recent-dispatched', status: 'DISPATCHED' },
    });

    const subscription = await prisma.webhookSubscription.create({
      data: { url: 'http://localhost/hook', secret: 'segredo', userId: user.userId },
    });
    const oldDelivery = await prisma.webhookDelivery.create({
      data: { subscriptionId: subscription.id, status: 'SUCCESS', payload: '{}', createdAt: oldDate },
    });
    const recentDelivery = await prisma.webhookDelivery.create({
      data: { subscriptionId: subscription.id, status: 'SUCCESS', payload: '{}' },
    });

    const removedEvents = await maintenance.purgeDispatchedOutboxEvents();
    const removedDeliveries = await maintenance.purgeOldWebhookDeliveries();

    expect(removedEvents).toBe(1);
    expect(removedDeliveries).toBe(1);

    expect(await prisma.outboxEvent.findUnique({ where: { id: oldDispatched.id } })).toBeNull();
    expect(await prisma.outboxEvent.findUnique({ where: { id: recentDispatched.id } })).not.toBeNull();
    expect(await prisma.outboxEvent.findUnique({ where: { id: oldPending.id } })).not.toBeNull();
    expect(await prisma.webhookDelivery.findUnique({ where: { id: oldDelivery.id } })).toBeNull();
    expect(await prisma.webhookDelivery.findUnique({ where: { id: recentDelivery.id } })).not.toBeNull();
  });
});
