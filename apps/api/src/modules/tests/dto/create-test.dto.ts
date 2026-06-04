import { IsUUID } from 'class-validator';

export class CreateTestDto {
  @IsUUID()
  weaknessId: string;
}
