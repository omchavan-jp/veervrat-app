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
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username may only contain lowercase letters, numbers, and underscores',
  })
  username?: string;

  @IsOptional()
  @IsIn(['EN', 'MR'])
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gender?: string;

  // Date of birth is NOT collected here any more. It is required at account creation and
  // validated against the minimum age before the account exists — see
  // spec/decisions/21_age-and-personal-attributes.md. Collecting it again here would imply it
  // is editable, and an age gate that can be edited afterwards is not a gate.
}
