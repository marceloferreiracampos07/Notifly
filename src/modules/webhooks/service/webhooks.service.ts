import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private static readonly MAX_ATTEMPTS = 3;
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async createSubscription(userId: string, url: string) {
    const secret = crypto.randomBytes(32).toString('hex');

    return this.prisma.webhookSubscription.create({
      data: {
        url,
        secret,
        userId,
      },
    });
  }

  async getdelivery(userId: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { subscription: { userId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Salva ou atualiza o status da entrega no banco de dados.
   * Se receber um deliveryId, atualiza a tentativa existente (útil para retries).
   */
  private async persistDelivery(params: {
    subscriptionId: string;
    status: 'SUCCESS' | 'FAILED';
    payload: string;
    deliveryId?: string;
    attempts?: number;
    errorMessage?: string;
  }) {
    const { subscriptionId, status, payload, deliveryId, attempts = 1, errorMessage } = params;

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

  /**
   * Dispara o evento para todas as assinaturas do usuário.
   */
  async dispatchEvent(userId: string, eventType: string, payload: any) {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.log(`Nenhum webhook cadastrado para o usuário ${userId}`);
      return;
    }

    const eventPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    // Dispara o envio para todas as URLs em paralelo
    await Promise.all(
      subscriptions.map((sub) => this.deliverWebhook(sub, eventPayload)),
    );
  }

  /**
   * Lógica central de envio HTTP e assinatura HMAC.
   */
  private async deliverWebhook(
    subscription: any,
    eventPayload: any,
    deliveryId?: string,
    currentAttempts = 0,
  ) {
    if (!subscription.secret) {
      this.logger.warn(`Subscription ${subscription.id} não possui chave secreta definida`);
      return;
    }

    const payloadString = JSON.stringify(eventPayload);
    const assinatura = crypto
      .createHmac('sha256', subscription.secret)
      .update(payloadString)
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': `sha256=${assinatura}`,
    };

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

      this.logger.error(`Falha na entrega para ${subscription.url} (Tentativa ${nextAttempt}): ${errorMessage}`);

     
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

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedDeliveries() {
    this.logger.log('Inspecionando webhooks com falha para reenvio...');

    const failedDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: WebhooksService.MAX_ATTEMPTS },
      },
      include: { subscription: true },
      take: 50, 
    });

    if (failedDeliveries.length === 0) {
      this.logger.log('Nenhum webhook falhado encontrado para retry.');
      return;
    }

    for (const delivery of failedDeliveries) {
      try {
        const parsedPayload = JSON.parse(delivery.payload);
        
        
        await this.deliverWebhook(
          delivery.subscription,
          parsedPayload,
          delivery.id,
          delivery.attempts,
        );
      } catch (err) {
        this.logger.error(`Erro ao tentar reprocessar o delivery ${delivery.id}:`, err);
      }
    }
  }
}