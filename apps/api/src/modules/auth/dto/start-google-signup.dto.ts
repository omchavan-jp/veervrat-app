import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentDto } from './register.dto';

/**
 * Starts Google signup: the age gate and consent are collected before the browser ever leaves
 * for Google, so no account can be created for someone who does not qualify.
 */
export class StartGoogleSignupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username may only contain lowercase letters, numbers, and underscores',
  })
  username: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  dob: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ConsentDto)
  consents: ConsentDto[];

  @IsOptional()
  @IsIn(['EN', 'MR'])
  language?: string;
}
