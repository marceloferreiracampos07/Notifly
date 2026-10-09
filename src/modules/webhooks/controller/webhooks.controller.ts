import { Controller, Post, Get, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { WebhooksService } from '../service/webhooks.service.js';
import { CreateWebhookSubscriptionDto } from '../DTO/Creatsubscription.js';
import { CurrentUser } from '../../../common/decorators/get-user-decorator.js';
import { UserSession } from '../../interface_user/user-session.interface.js';

@Controller('webhooks')
export class WebhooksController {
    constructor(private readonly webhookservice:WebhooksService){}
@HttpCode(HttpStatus.CREATED)
@Post('subscription')
async CreateSubscription(@Body() createweebhooksubscription : CreateWebhookSubscriptionDto , @CurrentUser() user:UserSession){
return this.webhookservice.createSubscription(user.id , createweebhooksubscription.url)
}
@Get('deliveries')
async getSubscription(@CurrentUser() user:UserSession){
    return this.webhookservice.getdelivery(user.id)
}
 
}
