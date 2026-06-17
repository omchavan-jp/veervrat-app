import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TagEntityType } from '@prisma/client';

export class FormalTagDto {
  @IsEnum(TagEntityType)
  entityType!: TagEntityType;

  @IsUUID()
  entityId!: string;
}

export class CreateShlokaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  devanagariText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  transliteration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  meaningEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  meaningMr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  sourceCitation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  looseTags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FormalTagDto)
  formalTags?: FormalTagDto[];
}

export class UpdateShlokaDto extends CreateShlokaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  declare devanagariText: string;
}

export class ScheduleShlokaDto {
  // ISO date (YYYY-MM-DD); time component ignored.
  @IsString()
  @MaxLength(10)
  date!: string;

  @IsUUID()
  shlokaId!: string;
}

export class ReorderQueueDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  shlokaIds!: string[];
}
