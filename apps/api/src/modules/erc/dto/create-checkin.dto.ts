import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CheckinStatus } from '@prisma/client';

export class CreateCheckinDto {
  @IsEnum(CheckinStatus)
  status: CheckinStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
