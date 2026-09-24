import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CriarApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nome: string; 

  @IsOptional()
  @IsDateString()
  expiraEm?: string; 
}
