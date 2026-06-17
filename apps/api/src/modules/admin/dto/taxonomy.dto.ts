import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateVirtueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameMr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateVirtueDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameMr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CreateSubvirtueDto extends CreateVirtueDto {
  @IsUUID()
  virtueId!: string;
}

export class UpdateSubvirtueDto extends UpdateVirtueDto {
  @IsOptional()
  @IsUUID()
  virtueId?: string;
}

export class CreateWeaknessDto extends CreateVirtueDto {
  @IsOptional()
  @IsString()
  @MaxLength(8)
  category?: string;
}

export class UpdateWeaknessDto extends UpdateVirtueDto {
  @IsOptional()
  @IsString()
  @MaxLength(8)
  category?: string;
}

export class LinkWeaknessSubvirtueDto {
  @IsUUID()
  weaknessId!: string;

  @IsUUID()
  subvirtueId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
