import { IsObject, IsString, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsObject()
  content: any;

  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  journeyId?: string;

  @IsOptional()
  @IsString()
  tempId?: string;
}
