import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpsertCmsPageDto {
  // Stable slug used to fetch the page, e.g. "why-shlokas", "pothi-intro".
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'key must be lowercase kebab-case' })
  @MaxLength(80)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  titleEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleMr?: string;

  // Tiptap JSON documents — sanitized in the service.
  @IsObject()
  bodyEn!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bodyMr?: Record<string, unknown>;
}

export class UpdateCmsPageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleMr?: string;

  @IsOptional()
  @IsObject()
  bodyEn?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bodyMr?: Record<string, unknown>;
}
