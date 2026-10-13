import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { WebhookDeliveryService } from '../../src/modules/webhooks/service/webhook-delivery.service.js';
import { WebhookSigner } from '../../src/modules/webhooks/service/webhook-signer.service.js';

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;
  let prismaMock: any;
  let httpServiceMock: any;

  const subscription = {
    id: 'sub-1',
    url: 'https://cliente.com/hook',
    secret: 'chave-secreta-webhook',
  };
  const eventPayload = { event: 'notification.sent', data: { notificationId: 'notif-1' } };

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    prismaMock = {
      webhookDelivery: {
        create: vi.fn().mockResolvedValue({ id: 'delivery-1' }),
        update: vi.fn().mockResolvedValue({ id: 'delivery-1' }),
      },
    };

    httpServiceMock = {
      post: vi.fn(),
    };

    service = new WebhookDeliveryService(
      prismaMock,
      httpServiceMock,
      new WebhookSigner(),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve assinar, enviar via POST e persistir como SUCCESS', async () => {
    httpServiceMock.post.mockReturnValue(of({ status: 200, data: {} }));

    await service.deliver({ subscription, eventPayload });

    const [url, payload, options] = httpServiceMock.post.mock.calls[0];
    expect(url).toBe('https://cliente.com/hook');
    expect(payload).toBe(eventPayload);
    expect(options.headers['X-Hub-Signature-256']).toMatch(/^sha256=[a-f0-9]{64}$/);

    expect(prismaMock.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: 'sub-1',
        status: 'SUCCESS',
        attempts: 1,
        lastError: null,
      }),
    });
  });

  it('deve persistir como FAILED com a mensagem HTTP quando o POST falhar', async () => {
    httpServiceMock.post.mockReturnValue(
      throwError(() => ({ message: 'timeout', response: { status: 504 } })),
    );

    await service.deliver({ subscription, eventPayload });

    expect(prismaMock.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'FAILED',
        attempts: 1,
        lastError: 'HTTP 504: timeout',
      }),
    });
  });

  it('deve atualizar o registro existente quando receber um deliveryId', async () => {
    httpServiceMock.post.mockReturnValue(of({ status: 200 }));

    await service.deliver({ subscription, eventPayload, deliveryId: 'delivery-1', currentAttempts: 1 });

    expect(prismaMock.webhookDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: expect.objectContaining({ status: 'SUCCESS', attempts: 2 }),
    });
    expect(prismaMock.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it('nao deve enviar requisicao quando a subscription nao possuir secret', async () => {
    await service.deliver({ subscription: { ...subscription, secret: null }, eventPayload });

    expect(httpServiceMock.post).not.toHaveBeenCalled();
    expect(prismaMock.webhookDelivery.create).not.toHaveBeenCalled();
  });
});
