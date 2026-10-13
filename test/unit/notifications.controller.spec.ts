import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationsController } from '../../src/modules/notification/controller/notifications.js';
import { NotificationChannel } from '../../src/modules/notification/enum/notification-channel.enum.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsServiceMock: any;

  beforeEach(() => {
    notificationsServiceMock = {
      send: vi.fn(),
      findAll: vi.fn(),
      getStatusById: vi.fn(),
    };

    controller = new NotificationsController(notificationsServiceMock);
  });

  it('deve delegar o envio para o notificationsService usando o id do usuario logado', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    const dto = {
      title: 'Aviso',
      content: 'Mensagem',
      channel: NotificationChannel.EMAIL,
      recipient: 'dest@example.com',
    };

    notificationsServiceMock.send.mockResolvedValue({
      success: true,
      notificationId: 'notif-1',
    });

    const result = await controller.send(user, dto);

    expect(result.success).toBe(true);
    expect(notificationsServiceMock.send).toHaveBeenCalledWith('user-1', dto);
  });

  it('deve delegar a listagem com filtros para o notificationsService', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    const query = { page: 1, limit: 10 };
    notificationsServiceMock.findAll.mockResolvedValue({ data: [], meta: {} });

    const result = await controller.findAll(user, query);

    expect(result).toEqual({ data: [], meta: {} });
    expect(notificationsServiceMock.findAll).toHaveBeenCalledWith('user-1', query);
  });

  it('deve buscar o status da notificacao passando o id e o usuario logado', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    notificationsServiceMock.getStatusById.mockResolvedValue({ id: 'notif-1', status: 'SENT' });

    const result = await controller.getStatus('notif-1', user);

    expect(result.status).toBe('SENT');
    expect(notificationsServiceMock.getStatusById).toHaveBeenCalledWith('notif-1', 'user-1');
  });
});
