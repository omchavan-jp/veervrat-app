import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Audited } from '../audit/audited.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { ApproveCustomErcDto } from './dto/approve-custom-erc.dto';
import { RejectCustomErcDto } from './dto/reject-custom-erc.dto';

@Controller('moderation/custom-erc')
@UseGuards(SessionGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  getQueue(@CurrentUser() user: SessionUser, @Query('cursor') cursor?: string) {
    return this.moderationService.getQueue(user, cursor);
  }

  @Get(':id')
  getDetail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.moderationService.getDetail(user, id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'moderator.approve_custom_erc',
    resourceType: 'custom_erc',
    resourceIdParam: 'id',
    metadata: (ctx) => ({ edits_made: !!(ctx.body as ApproveCustomErcDto)?.edits }),
  })
  approve(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: ApproveCustomErcDto) {
    return this.moderationService.approve(user, id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'moderator.reject_custom_erc',
    resourceType: 'custom_erc',
    resourceIdParam: 'id',
    metadata: (ctx) => ({ reason: (ctx.body as RejectCustomErcDto)?.reason }),
  })
  reject(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: RejectCustomErcDto) {
    return this.moderationService.reject(user, id, dto.reason);
  }
}
