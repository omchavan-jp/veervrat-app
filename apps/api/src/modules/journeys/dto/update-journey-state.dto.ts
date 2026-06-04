import { IsIn } from 'class-validator';

export class UpdateJourneyStateDto {
  @IsIn(['pause', 'resume'])
  action: 'pause' | 'resume';
}
