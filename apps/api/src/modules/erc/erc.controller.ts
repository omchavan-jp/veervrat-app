import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ErcService } from './erc.service';
import { SelectErcDto } from './dto/select-erc.dto';
import { UpdateErcStatusDto } from './dto/update-erc-status.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

// ─── Exposures ────────────────────────────────────────────────────────────────

@Controller('journeys/:journeyId/exposures')
@UseGuards(SessionGuard)
export class ExposuresController {
  constructor(public readonly ercService: ErcService) {}

  @Get('pool')
  getPool(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) { return this.ercService.getPool(u, j, 'exposure'); }

  @Get()
  list(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) { return this.ercService.listItems(u, j, 'exposure'); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  select(@Param('journeyId') j: string, @Body() dto: SelectErcDto, @CurrentUser() u: SessionUser) { return this.ercService.selectItem(u, j, dto.poolItemId, 'exposure'); }

  @Patch(':itemId/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('journeyId') j: string, @Param('itemId') i: string, @Body() dto: UpdateErcStatusDto, @CurrentUser() u: SessionUser) { return this.ercService.updateStatus(u, j, i, dto.status, 'exposure'); }

  @Post(':itemId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { return this.ercService.deactivate(u, j, i, 'exposure'); }

  @Post(':itemId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { return this.ercService.reactivate(u, j, i, 'exposure'); }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { await this.ercService.remove(u, j, i, 'exposure'); }
}

// ─── Resolutions ──────────────────────────────────────────────────────────────

@Controller('journeys/:journeyId/resolutions')
@UseGuards(SessionGuard)
export class ResolutionsController {
  constructor(public readonly ercService: ErcService) {}

  @Get('pool')
  getPool(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) { return this.ercService.getPool(u, j, 'resolution'); }

  @Get()
  list(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) { return this.ercService.listItems(u, j, 'resolution'); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  select(@Param('journeyId') j: string, @Body() dto: SelectErcDto, @CurrentUser() u: SessionUser) { return this.ercService.selectItem(u, j, dto.poolItemId, 'resolution'); }

  @Patch(':itemId/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('journeyId') j: string, @Param('itemId') i: string, @Body() dto: UpdateErcStatusDto, @CurrentUser() u: SessionUser) { return this.ercService.updateStatus(u, j, i, dto.status, 'resolution'); }

  @Post(':itemId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { return this.ercService.deactivate(u, j, i, 'resolution'); }

  @Post(':itemId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { return this.ercService.reactivate(u, j, i, 'resolution'); }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { await this.ercService.remove(u, j, i, 'resolution'); }
}

// ─── Challenges ───────────────────────────────────────────────────────────────

@Controller('journeys/:journeyId/challenges')
@UseGuards(SessionGuard)
export class ChallengesController {
  constructor(public readonly ercService: ErcService) {}

  @Get('pool')
  getPool(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) { return this.ercService.getPool(u, j, 'challenge'); }

  @Get()
  list(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) { return this.ercService.listItems(u, j, 'challenge'); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  select(@Param('journeyId') j: string, @Body() dto: SelectErcDto, @CurrentUser() u: SessionUser) { return this.ercService.selectItem(u, j, dto.poolItemId, 'challenge'); }

  @Patch(':itemId/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('journeyId') j: string, @Param('itemId') i: string, @Body() dto: UpdateErcStatusDto, @CurrentUser() u: SessionUser) { return this.ercService.updateStatus(u, j, i, dto.status, 'challenge'); }

  @Post(':itemId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { return this.ercService.deactivate(u, j, i, 'challenge'); }

  @Post(':itemId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { return this.ercService.reactivate(u, j, i, 'challenge'); }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('journeyId') j: string, @Param('itemId') i: string, @CurrentUser() u: SessionUser) { await this.ercService.remove(u, j, i, 'challenge'); }
}
