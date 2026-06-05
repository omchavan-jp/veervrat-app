import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { InvitationType } from '@prisma/client';

export class SendInvitationDto {
  @IsEnum(InvitationType)
  type: InvitationType;

  @IsEmail()
  inviteeEmail: string;

  @IsOptional()
  @IsUUID()
  scopeId?: string;
}
