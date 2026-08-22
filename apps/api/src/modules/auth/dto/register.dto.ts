import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsIn,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  ArrayMaxSize,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

/** One policy document the user is agreeing to, at the version they were shown. */
export class ConsentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  documentKey: string;

  @IsInt()
  version: number;
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username may only contain lowercase letters, numbers, and underscores',
  })
  username: string;

  @IsOptional()
  @IsIn(['EN', 'MR'])
  language?: string;

  // Required, and checked against the minimum age server-side. Collected here rather than during
  // onboarding: onboarding happens after the account exists, and an age gate that runs after
  // account creation has already failed at its job.
  @IsDateString({ strict: true })
  @IsNotEmpty()
  dob: string;

  // What the user agreed to, and at which version. Recorded in the same transaction as the
  // account — see openspec/changes/age-gate-and-consent/design.md.
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ConsentDto)
  consents: ConsentDto[];
}
