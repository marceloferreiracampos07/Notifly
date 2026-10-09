import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_CONSTANTS } from './queue.constants.js';
import { NotificationProcessor } from './notification.processor.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WebhooksModule } from '../webhooks/webhooks.module.js';
import { NotificationModule } from '../notification/notifications.module.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<number>('REDIS_PORT')) || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QUEUE_CONSTANTS.NOTIFICATIONS,
      defaultJobOptions: {
        attempts: 3, 
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }, 
    }),
    
    WebhooksModule,
    NotificationModule
  ],
  providers: [
    PrismaService,         
    NotificationProcessor, 
  ],
  exports: [BullModule],
})
export class QueuesModule {}
