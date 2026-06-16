import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { InvitationType } from '@prisma/client';

export class SendInvitationDto {
  @IsEnum(InvitationType)
  type: InvitationType;

  // Either an email (invite anyone — platform or not-yet-a-user) OR a username
  // (invite an existing user found via search, whose email isn't exposed client-side).
  // At least one is required; the service resolves a username to the user's email.
  @IsOptional()
  @IsEmail()
  inviteeEmail?: string;

  @IsOptional()
  @IsString()
  inviteeUsername?: string;

  @IsOptional()
  @IsUUID()
  scopeId?: string;
}
