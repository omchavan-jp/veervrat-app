import { IsEnum, IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { FeedbackStatus } from '@prisma/client';

// NEW is the creation-only state — admins can move items forward, never back to NEW.
export class UpdateFeedbackDto {
  @IsEnum(FeedbackStatus)
  @IsIn([FeedbackStatus.TRIAGED, FeedbackStatus.DONE, FeedbackStatus.DECLINED])
  status!: FeedbackStatus;

  // Required when declining, optional (ignored) otherwise.
  @ValidateIf((o: UpdateFeedbackDto) => o.status === FeedbackStatus.DECLINED)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  declineReason?: string;
}
