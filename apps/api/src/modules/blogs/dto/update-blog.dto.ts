import { IsBoolean, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;

  // Set false to publish a draft.
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
