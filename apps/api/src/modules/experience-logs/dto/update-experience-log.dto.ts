import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExperienceVisibility } from '@prisma/client';
import { ExperienceTagDto } from './experience-tag.dto';

export class UpdateExperienceLogDto {
  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(ExperienceVisibility)
  visibility?: ExperienceVisibility;

  // Set false to publish a draft.
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => ExperienceTagDto)
  tags?: ExperienceTagDto[];
}
