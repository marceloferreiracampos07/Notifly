import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { WebhookDeliveryService } from './webhook-delivery.service.js';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  async createSubscription(userId: string, url: string) {
    const secret = crypto.randomBytes(32).toString('hex');

    return this.prisma.webhookSubscription.create({
      data: {
        url,
        secret,
        userId,
      },
      select: {
        id: true,
        url: true,
        userId: true,
        createdAt: true,
      },
    });
  }

  async getDeliveries(userId: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { subscription: { userId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async dispatchEvent(userId: string, eventType: string, payload: unknown) {
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

    await Promise.all(
      subscriptions.map((subscription) =>
        this.deliveryService.deliver({ subscription, eventPayload }),
      ),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedDeliveries() {
    this.logger.log('Inspecionando webhooks com falha para reenvio...');

    const failedDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: 3 },
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

        await this.deliveryService.deliver({
          subscription: delivery.subscription,
          eventPayload: parsedPayload,
          deliveryId: delivery.id,
          currentAttempts: delivery.attempts,
        });
      } catch (err) {
        this.logger.error(`Erro ao tentar reprocessar o delivery ${delivery.id}:`, err);
      }
    }
  }
}
