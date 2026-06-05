import { IsUUID } from 'class-validator';

export class SelectErcDto {
  @IsUUID()
  poolItemId: string;
}
