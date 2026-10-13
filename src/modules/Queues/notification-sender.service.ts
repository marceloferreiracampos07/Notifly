import { Injectable, Logger } from '@nestjs/common';
import { NotificationJobPayloadDto } from './DTO/payload.dto.js';

@Injectable()
export class NotificationSender {
  private readonly logger = new Logger(NotificationSender.name);

  async send({ channel, recipient, title }: NotificationJobPayloadDto): Promise<void> {
    this.logger.log(
      `Enviando notificação via [${channel}] para o destinatário: ${recipient} | Título: "${title}"`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
