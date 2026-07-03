import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FeedbackType } from '@prisma/client';

export class CreateFeedbackDto {
  @IsEnum(FeedbackType)
  type!: FeedbackType;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Client-supplied diagnostics — validated and length-capped, never trusted for authz.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  viewport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  commitSha?: string;
}
