import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePothiSectionDto {
  @IsInt()
  @Min(0)
  sectionNumber!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  titleEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleMr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  introText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  congregationResponse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  postShlokaCommentary?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(200)
  shlokaIds?: string[];
}

export class UpdatePothiSectionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sectionNumber?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleMr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  introText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  congregationResponse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  postShlokaCommentary?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(200)
  shlokaIds?: string[];
}
