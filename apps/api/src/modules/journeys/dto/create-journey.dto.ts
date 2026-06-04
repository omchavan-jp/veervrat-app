import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJourneyDto {
  @IsUUID()
  sentenceId: string;

  @IsUUID()
  weaknessId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
