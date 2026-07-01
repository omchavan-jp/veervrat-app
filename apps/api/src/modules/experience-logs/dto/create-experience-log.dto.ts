import {
  IsArray,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExperienceTagDto } from './experience-tag.dto';

export class CreateExperienceLogDto {
  // Tiptap JSON document — structurally validated/sanitized in the service.
  @IsObject()
  body!: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  journeyId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => ExperienceTagDto)
  tags?: ExperienceTagDto[];
}
