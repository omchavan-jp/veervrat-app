import { IsString, IsOptional } from 'class-validator';

export class CreateCustomErcDto {
  @IsString()
  titleEn!: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;
}
