import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_CONSTANTS } from './queue.constants.js';
import { NotificationSender } from './notification-sender.service.js';
import { WebhooksService } from '../webhooks/service/webhooks.service.js';
import { NotificationsService } from '../notification/service/notifications.service.js';
import { NotificationJobPayloadDto } from './DTO/payload.dto.js';
import { NotificationStatus } from '../notification/enum/notification-status.enum.js';

@Processor(QUEUE_CONSTANTS.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationSender: NotificationSender,
    private readonly webhookService: WebhooksService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(
    job: Job<NotificationJobPayloadDto, { success: boolean; notificationId: string }, string>,
  ): Promise<{ success: boolean; notificationId: string }> {
    const { notificationId, userId, channel, recipient } = job.data;

    this.logger.log(
      `Processando job ${job.id} - Tentativa ${job.attemptsMade + 1} para a notificação ${notificationId}...`,
    );

    try {
      await this.notificationSender.send(job.data);

      await this.notificationsService.updateStatus(notificationId, NotificationStatus.SENT);

      await this.webhookService.dispatchEvent(userId, 'notification.sent', {
        notificationId,
        channel,
        recipient,
        status: NotificationStatus.SENT,
        sentAt: new Date().toISOString(),
      });

      return { success: true, notificationId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no envio';
      this.logger.error(
        `Falha temporária no job ${job.id} (Notificação ${notificationId}): ${errorMessage}`,
      );

      const maxAttempts = job.opts.attempts ?? 3;

      if (job.attemptsMade >= maxAttempts - 1) {
        this.logger.warn(
          `Notificação ${notificationId} atingiu o limite de ${maxAttempts} tentativas e faliu de vez.`,
        );

        await this.notificationsService.updateStatus(notificationId, NotificationStatus.FAILED);

        await this.webhookService.dispatchEvent(userId, 'notification.failed', {
          notificationId,
          channel,
          recipient,
          status: NotificationStatus.FAILED,
          error: errorMessage,
          failedAt: new Date().toISOString(),
        });
      }

      throw error;
    }
  }
}
