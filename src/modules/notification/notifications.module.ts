import { Module } from '@nestjs/common';
import { NotificationsController } from './controller/notifications.js';
import { NotificationsService } from './service/notifications.service.js';
import { QueuesModule } from '../Queues/queues.module.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [QueuesModule,ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationModule {}