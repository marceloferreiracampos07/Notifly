import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SendNotificationDto } from '../Dto/send-notification.js';

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
          status: 'QUEUED', 
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
          status: 'PENDING',
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
}