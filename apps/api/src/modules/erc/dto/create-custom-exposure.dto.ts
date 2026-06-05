import { IsEnum } from 'class-validator';
import { ExposureTier } from '@prisma/client';
import { CreateCustomErcDto } from './create-custom-erc.dto';

export class CreateCustomExposureDto extends CreateCustomErcDto {
  @IsEnum(ExposureTier)
  tier!: ExposureTier;
}
