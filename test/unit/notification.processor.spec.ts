import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { NotificationProcessor } from '../../src/modules/Queues/notification.processor.js';
import { NotificationStatus } from '../../src/modules/notification/enum/notification-status.enum.js';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let notificationSenderMock: any;
  let webhookServiceMock: any;
  let notificationsServiceMock: any;

  const job = (attemptsMade: number): any => ({
    id: 'job-1',
    attemptsMade,
    opts: { attempts: 3 },
    data: {
      notificationId: 'notif-1',
      userId: 'user-1',
      channel: 'EMAIL',
      recipient: 'cliente@teste.com',
      title: 'Aviso',
      content: 'Conteudo',
    },
  });

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    notificationSenderMock = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    webhookServiceMock = {
      dispatchEvent: vi.fn(),
    };

    notificationsServiceMock = {
      updateStatus: vi.fn(),
    };

    processor = new NotificationProcessor(
      notificationSenderMock,
      webhookServiceMock,
      notificationsServiceMock,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve processar o job, atualizar status para SENT e disparar webhook notification.sent', async () => {
    const result = await processor.process(job(0));

    expect(result).toEqual({ success: true, notificationId: 'notif-1' });
    expect(notificationSenderMock.send).toHaveBeenCalledWith({
      notificationId: 'notif-1',
      userId: 'user-1',
      channel: 'EMAIL',
      recipient: 'cliente@teste.com',
      title: 'Aviso',
      content: 'Conteudo',
    });
    expect(notificationsServiceMock.updateStatus).toHaveBeenCalledWith(
      'notif-1',
      NotificationStatus.SENT,
    );
    expect(webhookServiceMock.dispatchEvent).toHaveBeenCalledWith(
      'user-1',
      'notification.sent',
      expect.objectContaining({
        notificationId: 'notif-1',
        status: NotificationStatus.SENT,
      }),
    );
  });

  it('deve marcar como FAILED e disparar notification.failed quando atingir o limite maximo de tentativas', async () => {
    notificationSenderMock.send.mockRejectedValue(new Error('Provider fora do ar'));

    await expect(processor.process(job(2))).rejects.toThrow('Provider fora do ar');

    expect(notificationsServiceMock.updateStatus).toHaveBeenCalledWith(
      'notif-1',
      NotificationStatus.FAILED,
    );
    expect(webhookServiceMock.dispatchEvent).toHaveBeenCalledWith(
      'user-1',
      'notification.failed',
      expect.objectContaining({
        notificationId: 'notif-1',
        status: NotificationStatus.FAILED,
        error: 'Provider fora do ar',
      }),
    );
  });
});
