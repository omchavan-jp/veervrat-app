import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  @MaxLength(254)
  newEmail!: string;

  @IsString()
  @MinLength(1)
  currentPassword!: string;
}

export class ConfirmEmailChangeDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
