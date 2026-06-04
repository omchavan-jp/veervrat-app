import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateJourneyTitleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;
}
