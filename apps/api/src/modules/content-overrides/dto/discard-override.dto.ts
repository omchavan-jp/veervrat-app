import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { OVERRIDE_LOCALES, type OverrideLocale } from './upsert-override.dto';

export class DiscardOverrideDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/, { message: 'key must be a dotted message path' })
  key!: string;

  @IsIn([...OVERRIDE_LOCALES])
  locale!: OverrideLocale;
}
