import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from '../service/notifications.service.js';
import { SendNotificationDto } from '../Dto/send-notification.js';
import { FilterNotificationDto } from '../Dto/filter-notification.dto.js';
import { CurrentUser } from '../../../common/decorators/get-user-decorator.js';
import type { UserSession } from '../../interface_user/user-session.interface.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @HttpCode(HttpStatus.ACCEPTED)
  @Post('send')
  async send(@CurrentUser() user: UserSession, @Body() dto: SendNotificationDto) {
    return this.notificationsService.send(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: UserSession, @Query() query: FilterNotificationDto) {
    return this.notificationsService.findAll(user.id, query);
  }

  @Get(':id')
  async getStatus(@Param('id') id: string, @CurrentUser() user: UserSession) {
    return this.notificationsService.getStatusById(id, user.id);
  }
}