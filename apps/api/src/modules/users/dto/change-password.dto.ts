import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

export class DeleteAccountDto {
  /**
   * Optional since #196: an account created with Google has no password, and proves itself by
   * signing in with Google again instead. Absence is not "no proof" — the server still requires
   * one, it simply accepts either.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  currentPassword?: string;
}
