import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class EntitySearchQueryDto {
  @IsString()
  @MaxLength(120)
  q!: string;

  @IsOptional()
  @IsIn(['all', 'concept', 'mine'])
  scope?: 'all' | 'concept' | 'mine';
}
