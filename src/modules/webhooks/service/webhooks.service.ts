import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
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
  async getdelivery(userId:string){
    return this.prisma.webhookDelivery.findMany({where: {subscription:{ userId:userId} },orderBy:{createdAt : 'desc'}})
  }

  private async saveDelivery(subscriptionId: string, status: 'SUCCESS' | 'FAILED', payload: any) {
    return this.prisma.webhookDelivery.create({
      data: {
        subscriptionId: subscriptionId,
        status: status,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      },
    });
  }

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

    const payloadString = JSON.stringify(eventPayload);

    for (const sub of subscriptions) {
      if (!sub.secret) {
        this.logger.warn(`Subscription ${sub.id} não possui chave secreta definida`);
        continue;
      }

      const assinatura = crypto
        .createHmac('sha256', sub.secret)
        .update(payloadString)
        .digest('hex');

      const headers = {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${assinatura}`,
      };

      try {
        await firstValueFrom(
          this.httpService.post(sub.url, eventPayload, { headers, timeout: 5000 }),
        );

        await this.saveDelivery(sub.id, 'SUCCESS', eventPayload);
        this.logger.log(`Webhook [${eventType}] entregue com sucesso para ${sub.url}`);
      } catch (error: any) {
        const statusHttp = error.response?.status || 500;
        const errorMessage = error.message || 'Erro desconhecido ao tentar entregar o webhook';

        this.logger.error(`Falha ao entregar webhook [${eventType}] para ${sub.url} (Status: ${statusHttp}): ${errorMessage}`,);

        await this.saveDelivery(sub.id, 'FAILED', {
          ...eventPayload,
          error: errorMessage,
          statusCode: statusHttp,
        });
      }
    }
  }
}
