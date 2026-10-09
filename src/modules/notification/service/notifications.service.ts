import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SendNotificationDto } from '../Dto/send-notification.js';
import { FilterNotificationDto } from '../Dto/filter-notification.dto.js';
import { NotificationStatus } from '../enum/notification-status.enum.js';
import { OutboxStatus } from '../enum/outbox-status.enum.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async send(userId: string, dto: SendNotificationDto) {
    const userExists = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          title: dto.title,
          content: dto.content,
          channel: dto.channel,
          recipient: dto.recipient,
          status: NotificationStatus.QUEUED,
          userId: userId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Notification',
          aggregateId: notification.id,
          type: 'send-notification',
          payload: JSON.stringify({
            ...dto,
            notificationId: notification.id,
            userId: userId,
          }),
          status: OutboxStatus.PENDING,
        },
      });

      return { notificationId: notification.id };
    });

    return {
      success: true,
      message: 'Notificação registrada com sucesso e agendada para processamento.',
      notificationId: result.notificationId,
    };
  }

  async getStatusById(notificationId: string, userId: string) {
    const notification = await this.prismaService.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
      select: {
        id: true,
        status: true,
        channel: true,
        recipient: true,
        createdAt: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    return notification;
  }

  async findAll(userId: string, filters: FilterNotificationDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId: userId,
    };

    if (filters.channel) {
      where.channel = filters.channel;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prismaService.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async updateStatus(notificationId: string, status: string) {
  return this.prismaService.notification.update({
    where: { id: notificationId },
    data: { status },
  });
}
}