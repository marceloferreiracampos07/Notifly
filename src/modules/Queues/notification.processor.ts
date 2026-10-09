import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_CONSTANTS } from './queue.constants.js';
import { Job } from 'bullmq';
import { WebhooksService } from '../webhooks/service/webhooks.service.js';
import { NotificationsService } from '../notification/service/notifications.service.js';
import { NotificationJobPayloadDto } from './DTO/payload.dto.js';
import { NotificationStatus } from '../notification/enum/notification-status.enum.js';
import { Logger } from '@nestjs/common'; 

@Processor(QUEUE_CONSTANTS.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly webhookService: WebhooksService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  private async simulateExternalProviderSend(channel: string, recipient: string, title: string): Promise<void> {
    this.logger.log(`Enviando notificação via [${channel}] para o destinatário: ${recipient} | Título: "${title}"`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }


  async process(job: Job<NotificationJobPayloadDto, { success: boolean; notificationId: string }, string>): Promise<{ success: boolean; notificationId: string }> {
    const { notificationId, userId, channel, recipient, title } = job.data;

    this.logger.log(`[Worker] Processando job ${job.id} - Tentativa ${job.attemptsMade + 1} para a notificação ${notificationId}...`);

    try {
    
      await this.simulateExternalProviderSend(channel, recipient, title);

     
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
      this.logger.error(`Falha temporária no job ${job.id} (Notificação ${notificationId}): ${errorMessage}`);

      const maxAttempts = job.opts.attempts ?? 3;
      
      
      if (job.attemptsMade >= maxAttempts - 1) {
        this.logger.warn(`Notificação ${notificationId} atingiu o limite de ${maxAttempts} tentativas e faliu de vez.`);
        
        
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
