import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackStatus } from '@prisma/client';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { ListFeedbackQueryDto } from './dto/list-feedback.query.dto';

@Controller('feedback')
@UseGuards(SessionGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Throttle({ default: { ttl: 3600000, limit: 10 } })
  async create(
    @CurrentUser() user: SessionUser,
    @Body() dto: CreateFeedbackDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.feedbackService.create(user, dto, userAgent);
  }

  @Get()
  async list(@CurrentUser() user: SessionUser, @Query() query: ListFeedbackQueryDto) {
    return this.feedbackService.list(
      user,
      query.includeResolved ?? false,
      query.cursor,
      query.pageSize,
    );
  }

  @Post(':id/upvote')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3600000, limit: 60 } })
  async toggleUpvote(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.feedbackService.toggleUpvote(user, id);
  }

  @Patch(':id')
  @Audited({
    action: 'feedback.manage',
    resourceType: 'feedback_item',
    resourceIdParam: 'id',
    metadata: (c) => ({
      from: (c.result as { previousStatus?: FeedbackStatus })?.previousStatus,
      to: (c.body as UpdateFeedbackDto)?.status,
      declineReason: (c.body as UpdateFeedbackDto)?.declineReason,
    }),
  })
  async updateStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.updateStatus(user, id, dto);
  }
}
