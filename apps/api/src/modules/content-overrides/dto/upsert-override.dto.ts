import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// The locales the in-context editor can stage overrides for — mirrors the web
// SUPPORTED_LOCALES. Kept lowercase to match the next-intl message file names.
export const OVERRIDE_LOCALES = ['en', 'mr'] as const;
export type OverrideLocale = (typeof OVERRIDE_LOCALES)[number];

export class UpsertOverrideDto {
  // Dotted next-intl message key, e.g. "feedback.buttonLabel". Values only — the editor
  // never creates or renames keys (that is a code change).
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/, { message: 'key must be a dotted message path' })
  key!: string;

  @IsIn([...OVERRIDE_LOCALES])
  locale!: OverrideLocale;

  // The edited value. ICU placeholder parity against `baseValue` is enforced in the service.
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  value!: string;

  // The value the editor started from (the currently-rendered text). Used for an immediate
  // placeholder-parity guardrail; the authoritative check runs at publish against the git
  // files. Client-supplied — never trusted for authorization.
  @IsString()
  @MaxLength(5000)
  baseValue!: string;
}
