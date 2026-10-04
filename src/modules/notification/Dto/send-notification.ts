import { IsEnum, IsNotEmpty, IsString } from 'class-validator';                                                        
    import { NotificationChannel } from '../enum/notification-channel.enum.js';                                            
                                                                                                                           
    export class SendNotificationDto {                                                                                     
      @IsEnum(NotificationChannel, {                                                                                       
        message: 'channel deve ser um canal válido: EMAIL, SMS ou PUSH',                                                   
      })                                                                                                                   
      @IsNotEmpty({ message: 'channel é obrigatório' })                                                                    
      channel: NotificationChannel;                                                                                        
                                                                                                                           
      @IsString({ message: 'recipient deve ser uma string' })                                                              
      @IsNotEmpty({ message: 'recipient é obrigatório (e-mail, telefone ou token push)' })                                 
      recipient: string;                                                                                                   
                                                                                                                           
      @IsString({ message: 'title deve ser uma string' })                                                                  
      @IsNotEmpty({ message: 'title é obrigatório' })                                                                      
      title: string;                                                                                                       
                                                                                                                           
      @IsString({ message: 'content deve ser uma string' })                                                                
      @IsNotEmpty({ message: 'content é obrigatório' })                                                                    
      content: string;                                                                                                     
    }                                                              