import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SuggestErcDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;
}
