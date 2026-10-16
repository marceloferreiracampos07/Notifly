import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceService } from '../../src/modules/maintenance/maintenance.service.js';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let prismaMock: any;
  let configMock: any;

  beforeEach(() => {
    prismaMock = {
      outboxEvent: { deleteMany: vi.fn() },
      webhookDelivery: { deleteMany: vi.fn() },
    };
    configMock = { get: vi.fn((_key: string, fallback: number) => fallback) };

    service = new MaintenanceService(prismaMock, configMock);
  });

  it('deve remover eventos de outbox DISPATCHED anteriores ao corte', async () => {
    prismaMock.outboxEvent.deleteMany.mockResolvedValue({ count: 3 });

    const removed = await service.purgeDispatchedOutboxEvents(10);

    expect(removed).toBe(3);
    const args = prismaMock.outboxEvent.deleteMany.mock.calls[0][0];
    expect(args.where.status).toBe('DISPATCHED');
    expect(args.where.createdAt.lt).toBeInstanceOf(Date);
  });

  it('deve remover entregas de webhook anteriores ao corte', async () => {
    prismaMock.webhookDelivery.deleteMany.mockResolvedValue({ count: 5 });

    const removed = await service.purgeOldWebhookDeliveries();

    expect(removed).toBe(5);
    const args = prismaMock.webhookDelivery.deleteMany.mock.calls[0][0];
    expect(args.where.createdAt.lt).toBeInstanceOf(Date);
  });
});
