import { Type } from 'class-transformer';
import { IsArray, IsIn, IsUUID, ValidateNested } from 'class-validator';

class AnswerItemDto {
  @IsUUID()
  sentenceId: string;

  @IsIn([1, 2, 3, 4])
  score: number;
}

export class SaveAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}
