import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Capability, JourneyState, Role } from '@prisma/client';

export class UpdateRolesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  @ArrayMaxSize(10)
  add?: Role[];

  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  @ArrayMaxSize(10)
  remove?: Role[];
}

export class SuspendUserDto {
  @IsBoolean()
  suspended!: boolean;
}

export class AnonymiseUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class OverrideJourneyStateDto {
  @IsEnum(JourneyState)
  state!: JourneyState;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class UpdateCapabilitiesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(Capability, { each: true })
  @ArrayMaxSize(10)
  add?: Capability[];

  @IsOptional()
  @IsArray()
  @IsEnum(Capability, { each: true })
  @ArrayMaxSize(10)
  remove?: Capability[];
}
