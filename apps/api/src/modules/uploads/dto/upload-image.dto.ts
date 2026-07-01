import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Image uploads arrive as base64 in the JSON body (not multipart). The global
// ValidationPipe (whitelist + forbidNonWhitelisted) enforces presence + rejects
// stray fields; MIME allowlist and size limits are enforced in the service.
export class UploadImageDto {
  @IsString()
  fileBuffer: string; // base64-encoded image

  @IsString()
  @MaxLength(255)
  filename: string;

  @IsString()
  @MaxLength(255)
  mimeType: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;
}
