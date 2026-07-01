import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { UploadImageDto } from './dto/upload-image.dto';

@Controller('uploads')
@UseGuards(SessionGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('chat')
  async uploadChatImage(@Body() request: UploadImageDto, @CurrentUser() user: SessionUser) {
    const result = await this.uploadsService.uploadChatImage(request, user);
    return { data: result };
  }

  @Post('experience')
  async uploadExperienceImage(@Body() request: UploadImageDto, @CurrentUser() user: SessionUser) {
    const result = await this.uploadsService.uploadImage(request, user, 'experience');
    return { data: result };
  }

  @Post('blog')
  async uploadBlogImage(@Body() request: UploadImageDto, @CurrentUser() user: SessionUser) {
    const result = await this.uploadsService.uploadImage(request, user, 'blog');
    return { data: result };
  }
}
