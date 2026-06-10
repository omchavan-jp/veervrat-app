import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Query,
  Body,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

interface UploadChatImageRequest {
  fileBuffer: string; // base64 encoded
  filename: string;
  mimeType: string;
  roomId?: string;
}

@Controller('uploads')
@UseGuards(SessionGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('chat')
  async uploadChatImage(
    @Body() request: UploadChatImageRequest,
    @CurrentUser() user: SessionUser,
  ) {
    if (!request.fileBuffer || !request.filename || !request.mimeType) {
      throw new BadRequestException(
        'Missing required fields: fileBuffer, filename, mimeType',
      );
    }

    const result = await this.uploadsService.uploadChatImage(
      request,
      user,
    );
    return { data: result };
  }
}
