import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExperienceLogsService } from './experience-logs.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { CreateExperienceLogDto } from './dto/create-experience-log.dto';
import { UpdateExperienceLogDto } from './dto/update-experience-log.dto';

@Controller('experience-logs')
export class ExperienceLogsController {
  constructor(private readonly service: ExperienceLogsService) {}

  @Post()
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: SessionUser, @Body() dto: CreateExperienceLogDto) {
    return this.service.create(user, dto);
  }

  @Get()
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async getMine(@CurrentUser() user: SessionUser, @Query('cursor') cursor?: string) {
    return this.service.getMine(user, cursor);
  }

  // Declared before :id so it is matched first (guest-accessible public pool).
  @Get('public')
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getPublicPool(@Query('cursor') cursor?: string, @Query('featured') featured?: string) {
    return this.service.getPublicPool(cursor, featured === 'true');
  }

  @Get(':id')
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getOne(@CurrentUser() user: SessionUser | undefined, @Param('id') id: string) {
    // user may be undefined (guest) — the service authorizes view by visibility.
    return this.service.getOne(user as SessionUser, id);
  }

  @Patch(':id')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceLogDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
