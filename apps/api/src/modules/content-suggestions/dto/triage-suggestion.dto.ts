import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SuggestionStatus } from '@prisma/client';

export class TriageSuggestionDto {
  @IsEnum(SuggestionStatus)
  status!: SuggestionStatus;

  // Read by the author when a suggestion is declined, so it is not an unexplained rejection.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;

  // Where an accepted suggestion went. One of these, not both, in practice — but the service
  // does not enforce that: a suggestion can legitimately produce a CMS slot AND an issue.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  linkedIssue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  linkedCmsKey?: string;
}
