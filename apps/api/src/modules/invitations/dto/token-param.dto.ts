import { IsNotEmpty, IsString } from 'class-validator';

export class TokenParamDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
