import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../../src/modules/notification/service/notifications.service.js';
import { NotificationChannel } from '../../src/modules/notification/enum/notification-channel.enum.js';
import { NotificationStatus } from '../../src/modules/notification/enum/notification-status.enum.js';
import { OutboxStatus } from '../../src/modules/notification/enum/outbox-status.enum.js';
import type { SendNotificationDto } from '../../src/modules/notification/Dto/send-notification.js';
import type { FilterNotificationDto } from '../../src/modules/notification/Dto/filter-notification.dto.js';

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
  let prismaMock: any;
  let txMock: any;

  const dto: SendNotificationDto = {
    title: 'Bem-vindo',
    content: 'Corpo da mensagem',
    channel: NotificationChannel.EMAIL,
    recipient: 'cliente@teste.com',
  };

  beforeEach(() => {
    txMock = {
      notification: { create: vi.fn() },
      outboxEvent: { create: vi.fn() },
    };

    prismaMock = {
      user: { findUnique: vi.fn() },
      notification: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (callback: any) => callback(txMock)),
    };

    notificationsService = new NotificationsService(prismaMock);
  });

  describe('send', () => {
    it('deve registrar a notificacao (QUEUED) e o evento outbox em uma transacao atomica', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      txMock.notification.create.mockResolvedValue({ id: 'notif-123' });
      txMock.outboxEvent.create.mockResolvedValue({ id: 'outbox-123' });

      const result = await notificationsService.send('user-1', dto);

      expect(result).toEqual({
        success: true,
        message: 'Notificação registrada com sucesso e agendada para processamento.',
        notificationId: 'notif-123',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true },
      });

      expect(txMock.notification.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          content: dto.content,
          channel: dto.channel,
          recipient: dto.recipient,
          status: NotificationStatus.QUEUED,
          userId: 'user-1',
        },
      });

      expect(txMock.outboxEvent.create).toHaveBeenCalledOnce();
      const outboxArgs = txMock.outboxEvent.create.mock.calls[0][0];
      expect(outboxArgs.data).toMatchObject({
        aggregateType: 'Notification',
        aggregateId: 'notif-123',
        type: 'send-notification',
        status: OutboxStatus.PENDING,
      });
      expect(JSON.parse(outboxArgs.data.payload)).toEqual({
        ...dto,
        notificationId: 'notif-123',
        userId: 'user-1',
      });

      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    });

    it('deve lancar NotFoundException e nao abrir transacao se o usuario nao existir', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationsService.send('user-inexistente', dto),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getStatusById', () => {
    it('deve retornar os detalhes da notificacao pertencente ao usuario', async () => {
      const notification = {
        id: 'notif-1',
        status: NotificationStatus.SENT,
        channel: NotificationChannel.EMAIL,
        recipient: 'dest@teste.com',
        createdAt: new Date(),
      };
      prismaMock.notification.findFirst.mockResolvedValue(notification);

      const result = await notificationsService.getStatusById('notif-1', 'user-1');

      expect(result).toEqual(notification);
      expect(prismaMock.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        select: {
          id: true,
          status: true,
          channel: true,
          recipient: true,
          createdAt: true,
        },
      });
    });

    it('deve lancar NotFoundException se a notificacao nao for encontrada para aquele usuario', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(null);

      await expect(
        notificationsService.getStatusById('notif-404', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);
    });

    it('deve aplicar paginacao padrao (page=1, limit=10, skip=0)', async () => {
      const result = await notificationsService.findAll('user-1', {});

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('deve calcular o skip e o totalPages a partir da pagina e do limite informados', async () => {
      prismaMock.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      prismaMock.notification.count.mockResolvedValue(25);

      const result = await notificationsService.findAll('user-1', {
        page: 2,
        limit: 10,
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('deve filtrar por canal quando informado', async () => {
      await notificationsService.findAll('user-1', {
        channel: NotificationChannel.SMS,
      } as FilterNotificationDto);

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', channel: NotificationChannel.SMS },
        }),
      );
    });

    it('deve filtrar por intervalo de datas (gte/lte)', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await notificationsService.findAll('user-1', { startDate, endDate });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      );
    });

    it('deve filtrar apenas pela data inicial quando apenas ela for informada', async () => {
      const startDate = new Date('2026-01-01');

      await notificationsService.findAll('user-1', { startDate });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', createdAt: { gte: startDate } },
        }),
      );
    });

    it('deve filtrar apenas pela data final quando apenas ela for informada', async () => {
      const endDate = new Date('2026-01-31');

      await notificationsService.findAll('user-1', { endDate });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', createdAt: { lte: endDate } },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar o status da notificacao e retornar o registro atualizado', async () => {
      const updated = { id: 'notif-1', status: NotificationStatus.SENT };
      prismaMock.notification.update.mockResolvedValue(updated);

      const result = await notificationsService.updateStatus(
        'notif-1',
        NotificationStatus.SENT,
      );

      expect(result).toEqual(updated);
      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { status: NotificationStatus.SENT },
      });
    });
  });
});
