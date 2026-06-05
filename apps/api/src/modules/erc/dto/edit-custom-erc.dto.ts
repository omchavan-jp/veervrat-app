import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ExposureTier } from '@prisma/client';

export class EditCustomErcDto {
  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  // Exposure-specific
  @IsOptional()
  @IsEnum(ExposureTier)
  tier?: ExposureTier;

  // Resolution-specific
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  frequencyPerWeek?: number;

  @IsOptional()
  @IsString()
  frequencyLabel?: string;

  // Challenge-specific
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}
