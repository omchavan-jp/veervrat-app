import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { ContentOverridesService } from './content-overrides.service';
import { UpsertOverrideDto } from './dto/upsert-override.dto';

@Controller('content-overrides')
export class ContentOverridesController {
  constructor(private readonly service: ContentOverridesService) {}

  // Read is feature-gated (not session-gated) so the edit deployment's server can fetch the
  // staged overrides while rendering. Returns 404 when the feature is disabled (production).
  @Get()
  async getAll() {
    return this.service.getAllForMerge();
  }

  @Put()
  @UseGuards(SessionGuard)
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  async upsert(@CurrentUser() user: SessionUser, @Body() dto: UpsertOverrideDto) {
    return this.service.upsert(user, dto);
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
