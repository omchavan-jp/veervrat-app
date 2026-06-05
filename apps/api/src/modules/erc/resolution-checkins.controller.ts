import {
  Controller, Get, Post,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ResolutionCheckinsService } from './resolution-checkins.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('journeys/:journeyId/resolutions/:resolutionId/checkins')
@UseGuards(SessionGuard)
export class ResolutionCheckinsController {
  constructor(private readonly checkinsService: ResolutionCheckinsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  logCheckin(
    @Param('journeyId') journeyId: string,
    @Param('resolutionId') resolutionId: string,
    @Body() dto: CreateCheckinDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.checkinsService.logCheckin(user, journeyId, resolutionId, dto.status, dto.note);
  }

  @Get()
  listCheckins(
    @Param('journeyId') journeyId: string,
    @Param('resolutionId') resolutionId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.checkinsService.listCheckins(user, journeyId, resolutionId);
  }
}
