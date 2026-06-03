import { IsOptional, IsString, MaxLength, MinLength, Matches, IsIn } from 'class-validator';

export class CompleteOnboardingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, { message: 'Username may only contain lowercase letters, numbers, and underscores' })
  username?: string;

  @IsOptional()
  @IsIn(['EN', 'MR'])
  language?: string;
}
