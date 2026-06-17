import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { ContentService } from './content.service';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';

// All content reads are guest-accessible (spec/09, spec/19).
@Controller()
@UseGuards(OptionalSessionGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('pothi/sections')
  getPothiSections() {
    return this.content.getPothiSections();
  }

  // search + today declared before :id so they aren't swallowed as ids.
  @Get('shlokas/search')
  searchShlokas(@Query('q') q: string) {
    return this.content.searchShlokas(q ?? '');
  }

  @Get('shlokas/today')
  getToday() {
    return this.content.getToday();
  }

  @Get('shlokas')
  getShlokas(@Query('source') source?: string, @Query('cursor') cursor?: string) {
    return this.content.getShlokas(source, cursor);
  }

  @Get('shlokas/:id')
  getShloka(@Param('id') id: string) {
    return this.content.getShloka(id);
  }

  @Get('resources')
  getResources(@Query('type') type?: ResourceType, @Query('cursor') cursor?: string) {
    return this.content.getResources(type, cursor);
  }

  @Get('resources/:id')
  getResource(@Param('id') id: string) {
    return this.content.getResource(id);
  }
}
