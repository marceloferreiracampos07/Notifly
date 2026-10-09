import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './controller/notifications.js';
import { NotificationsService } from './service/notifications.service.js';
import { OutboxPublisherService } from './service/outbox-publisher.service.js';
import { QueuesModule } from '../Queues/queues.module.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    forwardRef(() => QueuesModule),
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, OutboxPublisherService],
  exports: [NotificationsService],
})
export class NotificationModule {}