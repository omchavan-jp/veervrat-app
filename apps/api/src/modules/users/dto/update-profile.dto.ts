import {
  IsOptional,
  IsString,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
  IsDateString,
  IsIn,
  ValidateIf,
} from 'class-validator';

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(USERNAME_REGEX, {
    message: 'username must be 3–30 characters, lowercase letters, digits, or underscores only',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @IsIn(['EN', 'MR'], { message: 'language must be EN or MR' })
  language?: string;

  // Send null to clear, a string to set, omit to leave unchanged
  @IsOptional()
  @ValidateIf((o: UpdateProfileDto) => o.gender !== null && o.gender !== undefined)
  @IsString()
  gender?: string | null;

  // Send null to clear, a date string to set, omit to leave unchanged
  @IsOptional()
  @ValidateIf((o: UpdateProfileDto) => o.dob !== null && o.dob !== undefined)
  @IsDateString()
  dob?: string | null;
}
