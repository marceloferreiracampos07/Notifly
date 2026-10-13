import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { WebhookSigner } from './webhook-signer.service.js';
import type { DeliverWebhook } from '../interfaces/deliver-webhook.interface.js';
import type { PersistWebhookDelivery } from '../interfaces/persist-webhook-delivery.interface.js';

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly signer: WebhookSigner,
  ) {}

  async deliver(dto: DeliverWebhook): Promise<void> {
    const { subscription, eventPayload, deliveryId, currentAttempts = 0 } = dto;

    if (!subscription.secret) {
      this.logger.warn(`Subscription ${subscription.id} não possui chave secreta definida`);
      return;
    }

    const payloadString = JSON.stringify(eventPayload);
    const headers = this.signer.buildHeaders(payloadString, subscription.secret);
    const nextAttempt = currentAttempts + 1;

    try {
      await firstValueFrom(
        this.httpService.post(subscription.url, eventPayload, { headers, timeout: 5000 }),
      );

      await this.persistDelivery({
        subscriptionId: subscription.id,
        status: 'SUCCESS',
        payload: payloadString,
        deliveryId,
        attempts: nextAttempt,
      });

      this.logger.log(`Webhook entregue com sucesso para ${subscription.url}`);
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao tentar entregar o webhook';
      const statusHttp = error.response?.status || 500;

      this.logger.error(
        `Falha na entrega para ${subscription.url} (Tentativa ${nextAttempt}): ${errorMessage}`,
      );

      await this.persistDelivery({
        subscriptionId: subscription.id,
        status: 'FAILED',
        payload: payloadString,
        deliveryId,
        attempts: nextAttempt,
        errorMessage: `HTTP ${statusHttp}: ${errorMessage}`,
      });
    }
  }

  private async persistDelivery(dto: PersistWebhookDelivery) {
    const { subscriptionId, status, payload, deliveryId, attempts = 1, errorMessage } = dto;

    if (deliveryId) {
      return this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status,
          attempts,
          lastError: errorMessage || null,
        },
      });
    }

    return this.prisma.webhookDelivery.create({
      data: {
        subscriptionId,
        status,
        payload,
        attempts,
        lastError: errorMessage || null,
      },
    });
  }
}
