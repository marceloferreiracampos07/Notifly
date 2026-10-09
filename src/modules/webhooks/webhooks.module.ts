
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhooksService } from './service/webhooks.service.js';
import { WebhooksController } from './controller/webhooks.controller.js';

@Module({
    imports:[
        HttpModule.register({
            timeout:5000,
        })
    ],
    controllers:[WebhooksController],
    providers:[WebhooksService],
    exports:[WebhooksService]
})
export class WebhooksModule {}
