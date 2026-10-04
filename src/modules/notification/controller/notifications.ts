import { Controller } from "@nestjs/common";                                                                                           
import { NotificationsService } from "../service/notifications.service.js";               
                                                                                                                           
@Controller('notifications')                                                                                           
export class NotificationsController {                                                                                 
      constructor(private readonly notificationsService: NotificationsService) {}         
      
}
                                                                                        