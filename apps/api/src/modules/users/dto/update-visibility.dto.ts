import { IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateVisibilityDto {
  @IsOptional()
  @IsBoolean()
  profilePrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  showLastActive?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnlineIndicator?: boolean;

  // Per-field map (e.g. { testsTaken: false }). Unknown keys / non-booleans are
  // dropped server-side by parseVisibility. Missing key = visible (public default).
  @IsOptional()
  @IsObject()
  profileVisibility?: Record<string, boolean>;
}
