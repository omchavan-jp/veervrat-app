import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentDto } from './register.dto';

/**
 * Starts Google signup: the age gate and consent are collected before the browser ever leaves
 * for Google, so no account can be created for someone who does not qualify.
 */
export class StartGoogleSignupDto {
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
