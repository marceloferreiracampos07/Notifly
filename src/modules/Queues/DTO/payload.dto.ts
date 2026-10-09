import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class NotificationJobPayloadDto {
  @IsUUID()
  @IsNotEmpty()
  notificationId!: string;

  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  channel!: string;

  @IsString()
  @IsNotEmpty()
  recipient!: string;
}
