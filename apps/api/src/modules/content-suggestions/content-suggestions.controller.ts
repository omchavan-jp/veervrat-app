import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { ContentSuggestionsService } from './content-suggestions.service';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { TriageSuggestionDto } from './dto/triage-suggestion.dto';
import { ListSuggestionsQueryDto } from './dto/list-suggestions.query.dto';
import { MineQueryDto } from './dto/mine.query.dto';

@Controller('content-suggestions')
@UseGuards(SessionGuard)
export class ContentSuggestionsController {
  constructor(private readonly service: ContentSuggestionsService) {}

  // Generous but not unbounded: someone working through a page may leave a dozen in a few
  // minutes, and that is the behaviour this feature exists to encourage.
  @Post()
  @Throttle({ default: { ttl: 3600000, limit: 100 } })
  async create(@CurrentUser() user: SessionUser, @Body() dto: CreateSuggestionDto) {
    return this.service.create(user, dto);
  }

  // The author's own. With `route` (and optionally `entityId`) it answers "what did I leave on
  // this page", which every page load asks in order to draw the pins.
  @Get('mine')
  async mine(@CurrentUser() user: SessionUser, @Query() query: MineQueryDto) {
    return this.service.listMine(user, query);
  }

  // Admin triage: every suggestion, whoever made it.
  @Get()
  async list(@CurrentUser() user: SessionUser, @Query() query: ListSuggestionsQueryDto) {
    return this.service.listAll(user, query);
  }

  @Patch(':id')
  @Audited({
    action: 'content_suggestion.triage',
    resourceType: 'content_suggestion',
    resourceIdParam: 'id',
    // The outcome is the point of the audit row: a triage that records nothing is the status
    // change this design exists to avoid.
    metadata: (c) => ({ status: (c.body as { status?: string })?.status }),
  })
  async triage(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TriageSuggestionDto,
  ) {
    return this.service.triage(user, id, dto);
  }
}
