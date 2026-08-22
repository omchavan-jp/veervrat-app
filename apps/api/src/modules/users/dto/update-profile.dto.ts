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

  // Correctable, but never clearable: it is a required field, and it is re-validated against the
  // minimum age on every change. Allowing a correction is worth it — a typo in a date of birth
  // is easy to make and impossible to fix otherwise — and it is safe, because a corrected value
  // still has to qualify. Omit to leave unchanged; null is rejected.
  @IsOptional()
  @IsDateString()
  dob?: string;
}
