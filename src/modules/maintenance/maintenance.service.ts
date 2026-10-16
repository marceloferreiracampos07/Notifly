import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OutboxStatus } from '../notification/enum/outbox-status.enum.js';

const DEFAULT_OUTBOX_RETENTION_DAYS = 7;
const DEFAULT_DELIVERY_RETENTION_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredRecords(): Promise<void> {
    const events = await this.purgeDispatchedOutboxEvents();
    const deliveries = await this.purgeOldWebhookDeliveries();

    this.logger.log(
      `Limpeza concluída: ${events} evento(s) de outbox e ${deliveries} entrega(s) de webhook removidos.`,
    );
  }

  /** Remove eventos de outbox já despachados além do período de retenção. */
  async purgeDispatchedOutboxEvents(retentionDays?: number): Promise<number> {
    const cutoff = this.cutoffFor(
      retentionDays,
      this.config.get<number>('OUTBOX_RETENTION_DAYS', DEFAULT_OUTBOX_RETENTION_DAYS),
    );

    const { count } = await this.prisma.outboxEvent.deleteMany({
      where: { status: OutboxStatus.DISPATCHED, createdAt: { lt: cutoff } },
    });

    return count;
  }

  /** Remove registros de entrega de webhook além do período de retenção. */
  async purgeOldWebhookDeliveries(retentionDays?: number): Promise<number> {
    const cutoff = this.cutoffFor(
      retentionDays,
      this.config.get<number>('WEBHOOK_DELIVERY_RETENTION_DAYS', DEFAULT_DELIVERY_RETENTION_DAYS),
    );

    const { count } = await this.prisma.webhookDelivery.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return count;
  }

  private cutoffFor(retentionDays: number | undefined, fallbackDays: number): Date {
    const days = Number(retentionDays ?? fallbackDays);
    return new Date(Date.now() - days * MILLISECONDS_PER_DAY);
  }
}
