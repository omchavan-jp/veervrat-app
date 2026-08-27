import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SuggestionStatus } from '@prisma/client';

export class ListSuggestionsQueryDto {
  @IsOptional()
  @IsEnum(SuggestionStatus)
  status?: SuggestionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;
}
