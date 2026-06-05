import { IsIn } from 'class-validator';

export class UpdateErcStatusDto {
  @IsIn(['in_progress', 'submitted', 'approved', 'revisit'])
  status: 'in_progress' | 'submitted' | 'approved' | 'revisit';
}
