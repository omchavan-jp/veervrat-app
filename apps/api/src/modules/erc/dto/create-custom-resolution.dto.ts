import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateCustomErcDto } from './create-custom-erc.dto';

export class CreateCustomResolutionDto extends CreateCustomErcDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  frequencyPerWeek?: number;

  @IsOptional()
  @IsString()
  frequencyLabel?: string;
}
