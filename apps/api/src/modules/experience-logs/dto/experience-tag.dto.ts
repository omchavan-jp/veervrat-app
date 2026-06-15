import { IsEnum, IsUUID } from 'class-validator';
import { TagEntityType } from '@prisma/client';

export class ExperienceTagDto {
  @IsEnum(TagEntityType)
  entityType!: TagEntityType;

  @IsUUID()
  entityId!: string;
}
