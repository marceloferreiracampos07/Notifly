import { IsUrl, IsNotEmpty } from 'class-validator';                                                                   
                                                                                                                           
    export class CreateWebhookSubscriptionDto {                                                                            
      @IsNotEmpty({ message: 'A URL do webhook é obrigatória.' })                                                          
      @IsUrl({}, { message: 'Forneça uma URL válida para o webhook (ex: https://meusite.com/webhook).' })                  
      url: string;                                                                                                         
    }                                    