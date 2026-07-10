import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { ContentOverridesService } from './content-overrides.service';
import { UpsertOverrideDto } from './dto/upsert-override.dto';
import { DiscardOverrideDto } from './dto/discard-override.dto';

@Controller('content-overrides')
export class ContentOverridesController {
  constructor(private readonly service: ContentOverridesService) {}

  // Read requires an allowlisted editor session (the web forwards the editor's cookie), so
  // staged drafts are never returned to other users. Returns 404 when the feature is disabled.
  @Get()
  @UseGuards(SessionGuard)
  async getAll(@CurrentUser() user: SessionUser) {
    return this.service.getAllForMerge(user);
  }

  @Patch()
  @UseGuards(SessionGuard)
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  @Audited({
    action: 'content.edit',
    resourceType: 'content_override',
    metadata: (c) => ({
      key: (c.body as UpsertOverrideDto)?.key,
      locale: (c.body as UpsertOverrideDto)?.locale,
    }),
  })
  async upsert(@CurrentUser() user: SessionUser, @Body() dto: UpsertOverrideDto) {
    return this.service.upsert(user, dto);
  }

  @Delete()
  @UseGuards(SessionGuard)
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  @Audited({
    action: 'content.discard',
    resourceType: 'content_override',
    metadata: (c) => ({
      key: (c.body as DiscardOverrideDto)?.key,
      locale: (c.body as DiscardOverrideDto)?.locale,
    }),
  })
  async discard(@CurrentUser() user: SessionUser, @Body() dto: DiscardOverrideDto) {
    return this.service.discard(user, dto.key, dto.locale);
  }

  @Post('publish')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3600000, limit: 20 } })
  @Audited({
    action: 'content.publish',
    resourceType: 'content_override',
    metadata: (c) => ({ prUrl: (c.result as { prUrl?: string })?.prUrl }),
  })
  async publish(@CurrentUser() user: SessionUser) {
    return this.service.publish(user);
  }
}
