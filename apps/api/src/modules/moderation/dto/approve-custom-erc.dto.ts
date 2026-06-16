import { IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Optional moderator edits applied to the custom item before pool promotion.
export class CustomErcEditsDto {
  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

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

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}

export class ApproveCustomErcDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CustomErcEditsDto)
  edits?: CustomErcEditsDto;
}
