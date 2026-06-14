import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JourneysService } from './journeys.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyStateDto } from './dto/update-journey-state.dto';
import { UpdateJourneyTitleDto } from './dto/update-journey-title.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('journeys')
@UseGuards(SessionGuard)
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateJourneyDto, @CurrentUser() user: SessionUser) {
    return this.journeysService.createJourney(user, dto);
  }

  @Get()
  async list(@CurrentUser() user: SessionUser, @Query('cursor') cursor?: string) {
    return this.journeysService.listJourneys(user, cursor);
  }

  @Get(':id')
  async detail(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.journeysService.getJourney(user, id);
  }

  @Get(':id/activity')
  async activity(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.journeysService.getActivity(user, id);
  }

  @Patch(':id/state')
  @HttpCode(HttpStatus.OK)
  async updateState(
    @Param('id') id: string,
    @Body() dto: UpdateJourneyStateDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.journeysService.updateState(user, id, dto.action);
  }

  @Patch(':id/title')
  @HttpCode(HttpStatus.OK)
  async updateTitle(
    @Param('id') id: string,
    @Body() dto: UpdateJourneyTitleDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.journeysService.updateTitle(user, id, dto.title);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async submitCompletion(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.journeysService.submitCompletion(user, id);
  }

  @Post(':id/complete/approve')
  @HttpCode(HttpStatus.OK)
  async approveCompletion(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.journeysService.approveCompletion(user, id);
  }
}
