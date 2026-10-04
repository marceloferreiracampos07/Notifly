import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_CONSTANTS } from '../../Queues/queue.constants.js';

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private isProcessing = false;

  constructor(
    @InjectQueue(QUEUE_CONSTANTS.NOTIFICATIONS) private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processEventOutbox() {
    if (this.isProcessing) {
      this.logger.warn('A varredura ainda está em execução...');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Iniciando varredura da tabela outbox...');

    try {
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: 50,
        orderBy: { createdAt: 'asc' },
      });

      if (pendingEvents.length === 0) {
        this.logger.log('Nenhum evento pendente encontrado.');
        return;
      }

      this.logger.log(`Encontrado(s) ${pendingEvents.length} evento(s) para despachar.`);

      for (const event of pendingEvents) {
        try {
          const parsedPayload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

          await this.notificationQueue.add(event.type, parsedPayload, {
            jobId: event.id,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          });

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSED' },
          });

          this.logger.log(`Evento ${event.id} ([${event.type}]) despachado com sucesso.`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          this.logger.error(`Falha ao despachar o evento ${event.id}:`, errorMessage);

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'FAILED' },
          });
        }
      }
    } catch (dbError) {
      const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Erro desconhecido';
      this.logger.error('Erro ao consultar a tabela OutboxEvent:', dbErrorMessage);
    } finally {
      this.isProcessing = false;
    }
  }
}