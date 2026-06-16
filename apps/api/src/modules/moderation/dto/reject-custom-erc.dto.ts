import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectCustomErcDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
