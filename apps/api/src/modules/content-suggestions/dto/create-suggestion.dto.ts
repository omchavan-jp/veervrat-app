import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SuggestionKind } from '@prisma/client';

// Caps on the captured location fields. These are attacker-influenced in the sense that anyone
// holding the capability can post anything; the point is that a runaway DOM path or a page of
// text cannot bloat a row. Generous enough that no honest capture is truncated.
const ROUTE_MAX = 512;
const TEXT_MAX = 2000;
const PATH_MAX = 1024;

export class CreateSuggestionDto {
  @IsEnum(SuggestionKind)
  kind!: SuggestionKind;

  // The route PATTERN (/weaknesses/[id]), not the resolved URL — see design.md decision 1.
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROUTE_MAX)
  route!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(ROUTE_MAX)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  entityId?: string;

  @IsIn(['EN', 'MR'])
  locale!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  anchorKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  anchorText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(PATH_MAX)
  anchorPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  viewport?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleMr?: string;

  // Tiptap documents, the shape CmsPage already stores.
  @IsOptional()
  @IsObject()
  bodyEn?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bodyMr?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  currentText?: string;
}
