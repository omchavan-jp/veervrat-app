import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EntitySearchService } from './entity-search.service';
import { EntitySearchQueryDto } from './dto/entity-search-query.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

// Powers the chat @/# entity-reference autocomplete. Auth-gated: results are scoped to
// what the caller may reference (shared taxonomy + their own private items).
@Controller('entity-search')
@UseGuards(SessionGuard)
export class EntitySearchController {
  constructor(private readonly entitySearchService: EntitySearchService) {}

  @Get()
  async search(@Query() dto: EntitySearchQueryDto, @CurrentUser() user: SessionUser) {
    const results = await this.entitySearchService.search(user, dto.q, dto.scope ?? 'all');
    return { data: results };
  }
}
