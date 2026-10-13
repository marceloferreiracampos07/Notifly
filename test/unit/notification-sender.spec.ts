import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { NotificationSender } from '../../src/modules/Queues/notification-sender.service.js';

describe('NotificationSender', () => {
  let sender: NotificationSender;
  let logSpy: any;

  beforeEach(() => {
    sender = new NotificationSender();
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('deve simular o envio aguardando o tempo do provider e registrando o log', async () => {
    const sendPromise = sender.send({
      notificationId: 'notif-1',
      userId: 'user-1',
      channel: 'EMAIL',
      recipient: 'cliente@teste.com',
      title: 'Aviso',
      content: 'Conteudo',
    });

    await vi.advanceTimersByTimeAsync(1000);
    await sendPromise;

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Enviando notificação via [EMAIL]'),
    );
  });
});
