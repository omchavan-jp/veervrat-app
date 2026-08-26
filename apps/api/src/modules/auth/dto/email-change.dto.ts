import { IsEmail, IsString, MaxLength, MinLength, IsOptional } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  @MaxLength(254)
  newEmail!: string;

  // Optional since #196 — see DeleteAccountDto. Either a password or a recent Google
  // re-authentication satisfies the server; neither being present still fails.
  @IsOptional()
  @IsString()
  @MinLength(1)
  currentPassword?: string;
}

export class ConfirmEmailChangeDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
