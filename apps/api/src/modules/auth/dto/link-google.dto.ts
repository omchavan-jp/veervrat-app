import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LinkGoogleDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
