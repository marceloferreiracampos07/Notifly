 import { IsEnum, IsOptional, IsInt, Min, IsDate } from 'class-validator';                                              
    import { Type } from 'class-transformer';                                                                              
    import { NotificationChannel } from '../enum/notification-channel.enum.js';                                            
                                                                                                                           
    export class FilterNotificationDto {                                                                                   
      @IsOptional()                                                                                                        
      @Type(() => Number)                                                                                                  
      @IsInt({ message: 'A página deve ser um valor inteiro.' })                                                           
      @Min(1, { message: 'A página precisa ser no mínimo 1.' })                                                            
      page?: number = 1;                                                                                                   
                                                                                                                           
      @IsOptional()                                                                                                        
      @Type(() => Number)                                                                                                  
      @IsInt({ message: 'O limite deve ser um valor inteiro.' })                                                           
      @Min(1, { message: 'O limite precisa ser no mínimo 1.' })                                                            
      limit?: number = 10;                                                                                                 
                                                                                                                           
      @IsOptional()                                                                                                        
      @IsEnum(NotificationChannel, {                                                                                       
        message: 'Canal inválido. Escolha EMAIL, SMS ou PUSH.',                                                            
      })                                                                                                                   
      channel?: NotificationChannel;                                                                                       
                                                                                                                           
      @IsOptional()                                                                                                        
      @Type(() => Date)                                                                                                    
      @IsDate({ message: 'Data inicial inválida.' })                                                                       
      startDate?: Date;                                                                                                    
                                                                                                                           
      @IsOptional()                                                                                                        
      @Type(() => Date)                                                                                                    
      @IsDate({ message: 'Data final inválida.' })                                                                         
      endDate?: Date;                                                                                                      
    }       