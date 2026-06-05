import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateCustomErcDto } from './create-custom-erc.dto';

export class CreateCustomChallengeDto extends CreateCustomErcDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}
