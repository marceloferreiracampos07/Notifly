import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { WebhooksService } from '../../src/modules/webhooks/service/webhooks.service.js';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prismaMock: any;
  let deliveryServiceMock: any;
  let errorLogSpy: any;

  const subscription = {
    id: 'sub-1',
    url: 'https://cliente.com/hook',
    secret: 'chave-secreta-webhook',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorLogSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    prismaMock = {
      webhookSubscription: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      webhookDelivery: {
        findMany: vi.fn(),
      },
    };

    deliveryServiceMock = {
      deliver: vi.fn().mockResolvedValue(undefined),
    };

    service = new WebhooksService(prismaMock, deliveryServiceMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSubscription', () => {
    it('deve criar a assinatura com um secret aleatorio e sem expo-lo na resposta', async () => {
      const createdSubscription = {
        id: 'sub-1',
        url: 'https://cliente.com/hook',
        userId: 'user-1',
        createdAt: new Date(),
      };
      prismaMock.webhookSubscription.create.mockResolvedValue(createdSubscription);

      const result = await service.createSubscription(
        'user-1',
        'https://cliente.com/hook',
      );

      expect(result).toEqual(createdSubscription);
      expect((result as any).secret).toBeUndefined();

      const createArgs = prismaMock.webhookSubscription.create.mock.calls[0][0];
      expect(createArgs.data.secret).toMatch(/^[a-f0-9]{64}$/);
      expect(createArgs.data).toMatchObject({
        url: 'https://cliente.com/hook',
        userId: 'user-1',
      });
      expect(createArgs.select).toEqual({
        id: true,
        url: true,
        userId: true,
        createdAt: true,
      });
    });
  });

  describe('getDeliveries', () => {
    it('deve listar as entregas do usuario em ordem decrescente', async () => {
      prismaMock.webhookDelivery.findMany.mockResolvedValue([{ id: 'd1' }]);

      const result = await service.getDeliveries('user-1');

      expect(result).toEqual([{ id: 'd1' }]);
      expect(prismaMock.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { subscription: { userId: 'user-1' } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('dispatchEvent', () => {
    it('nao deve entregar nada se o usuario nao tiver nenhuma subscription', async () => {
      prismaMock.webhookSubscription.findMany.mockResolvedValue([]);

      await service.dispatchEvent('user-sem-webhook', 'notification.sent', {});

      expect(deliveryServiceMock.deliver).not.toHaveBeenCalled();
    });

    it('deve delegar a entrega de cada subscription com o payload do evento', async () => {
      prismaMock.webhookSubscription.findMany.mockResolvedValue([subscription]);

      await service.dispatchEvent('user-1', 'notification.sent', {
        notificationId: 'notif-100',
      });

      expect(deliveryServiceMock.deliver).toHaveBeenCalledOnce();
      const [dto] = deliveryServiceMock.deliver.mock.calls[0];
      expect(dto.subscription).toBe(subscription);
      expect(dto.eventPayload).toMatchObject({
        event: 'notification.sent',
        data: { notificationId: 'notif-100' },
      });
      expect(dto.eventPayload.timestamp).toEqual(expect.any(String));
    });
  });

  describe('retryFailedDeliveries', () => {
    it('nao deve reenviar nada quando nao houver entregas falhadas', async () => {
      prismaMock.webhookDelivery.findMany.mockResolvedValue([]);

      await service.retryFailedDeliveries();

      expect(deliveryServiceMock.deliver).not.toHaveBeenCalled();
    });

    it('deve reenviar a entrega falhada reaproveitando o id e as tentativas', async () => {
      prismaMock.webhookDelivery.findMany.mockResolvedValue([
        {
          id: 'delivery-1',
          attempts: 1,
          payload: JSON.stringify({ event: 'notification.sent', data: {} }),
          subscription,
        },
      ]);

      await service.retryFailedDeliveries();

      expect(deliveryServiceMock.deliver).toHaveBeenCalledWith({
        subscription,
        eventPayload: { event: 'notification.sent', data: {} },
        deliveryId: 'delivery-1',
        currentAttempts: 1,
      });
    });

    it('deve continuar o processamento quando o payload de uma entrega for invalido', async () => {
      prismaMock.webhookDelivery.findMany.mockResolvedValue([
        { id: 'delivery-invalido', attempts: 1, payload: '{json invalido', subscription },
      ]);

      await service.retryFailedDeliveries();

      expect(deliveryServiceMock.deliver).not.toHaveBeenCalled();
      expect(errorLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('delivery-invalido'),
        expect.anything(),
      );
    });
  });
});
