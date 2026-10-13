import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutboxPublisherService } from '../../src/modules/notification/service/outbox-publisher.service.js';
import { OutboxStatus } from '../../src/modules/notification/enum/outbox-status.enum.js';

describe('OutboxPublisherService', () => {
  let service: OutboxPublisherService;
  let queueMock: any;
  let prismaMock: any;

  beforeEach(() => {
    queueMock = {
      add: vi.fn(),
    };

    prismaMock = {
      outboxEvent: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new OutboxPublisherService(queueMock, prismaMock);
  });

  it('deve buscar eventos pendentes, despachar para a fila BullMQ e marcar como DISPATCHED', async () => {
    const event = {
      id: 'event-1',
      type: 'send-notification',
      payload: JSON.stringify({ notificationId: 'notif-1', title: 'Teste' }),
      status: OutboxStatus.PENDING,
    };

    prismaMock.outboxEvent.findMany.mockResolvedValue([event]);
    queueMock.add.mockResolvedValue({});
    prismaMock.outboxEvent.update.mockResolvedValue({});

    await service.processEventOutbox();

    expect(queueMock.add).toHaveBeenCalledWith(
      'send-notification',
      { notificationId: 'notif-1', title: 'Teste' },
      expect.objectContaining({ jobId: 'event-1' }),
    );
    expect(prismaMock.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { status: OutboxStatus.DISPATCHED },
    });
  });

  it('deve marcar evento como FAILED se o enfileiramento falhar', async () => {
    const event = {
      id: 'event-error',
      type: 'send-notification',
      payload: { notificationId: 'notif-1' },
      status: OutboxStatus.PENDING,
    };

    prismaMock.outboxEvent.findMany.mockResolvedValue([event]);
    queueMock.add.mockRejectedValue(new Error('Redis desconectado'));
    prismaMock.outboxEvent.update.mockResolvedValue({});

    await service.processEventOutbox();

    expect(prismaMock.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-error' },
      data: { status: OutboxStatus.FAILED },
    });
  });
});
