import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { WebhooksService } from '../service/webhooks.service.js';
import { CreateWebhookSubscriptionDto } from '../DTO/Creatsubscription.js';
import { CurrentUser } from '../../../common/decorators/get-user-decorator.js';
import type { UserSession } from '../../interface_user/user-session.interface.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('subscription')
  async createSubscription(
    @Body() createWebhookSubscriptionDto: CreateWebhookSubscriptionDto,
    @CurrentUser() user: UserSession,
  ) {
    return this.webhooksService.createSubscription(user.id, createWebhookSubscriptionDto.url);
  }

  @Get('deliveries')
  async getDeliveries(@CurrentUser() user: UserSession) {
    return this.webhooksService.getDeliveries(user.id);
  }
 
}
