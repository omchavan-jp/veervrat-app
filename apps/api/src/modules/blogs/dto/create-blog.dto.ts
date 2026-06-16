import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  // Tiptap JSON document — structurally validated/sanitized in the service.
  @IsObject()
  body!: Record<string, unknown>;
}
