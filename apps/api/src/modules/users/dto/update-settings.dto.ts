import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @IsIn(['EN', 'MR'], { message: 'language must be EN or MR' })
  language?: string;

  @IsOptional()
  @IsBoolean()
  profilePrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  showLastActive?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnlineIndicator?: boolean;

  // Per-event email opt-out map (e.g. { JOURNEY_DORMANT: false }). Unknown keys /
  // non-booleans dropped server-side by parseNotificationPrefs.
  @IsOptional()
  @IsObject()
  notificationPrefs?: Record<string, boolean>;
}
