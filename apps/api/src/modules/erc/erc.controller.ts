import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ErcService } from './erc.service';
import { SelectErcDto } from './dto/select-erc.dto';
import { UpdateErcStatusDto } from './dto/update-erc-status.dto';
import { SuggestErcDto } from './dto/suggest-erc.dto';
import { CreateCustomExposureDto } from './dto/create-custom-exposure.dto';
import { CreateCustomResolutionDto } from './dto/create-custom-resolution.dto';
import { CreateCustomChallengeDto } from './dto/create-custom-challenge.dto';
import { EditCustomErcDto } from './dto/edit-custom-erc.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

// ─── Exposures ────────────────────────────────────────────────────────────────

@Controller('journeys/:journeyId/exposures')
@UseGuards(SessionGuard)
export class ExposuresController {
  constructor(public readonly ercService: ErcService) {}

  @Get('pool')
  getPool(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) {
    return this.ercService.getPool(u, j, 'exposure');
  }

  @Get()
  list(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) {
    return this.ercService.listItems(u, j, 'exposure');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  select(@Param('journeyId') j: string, @Body() dto: SelectErcDto, @CurrentUser() u: SessionUser) {
    return this.ercService.selectItem(u, j, dto.poolItemId, 'exposure');
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  createCustom(
    @Param('journeyId') j: string,
    @Body() dto: CreateCustomExposureDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.createCustomItem(u, j, dto, 'exposure');
  }

  @Patch(':itemId')
  @HttpCode(HttpStatus.OK)
  editCustom(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: EditCustomErcDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.editCustomItem(u, j, i, dto, 'exposure');
  }

  @Post(':itemId/submit-for-review')
  @HttpCode(HttpStatus.OK)
  submitForReview(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.submitForReview(u, j, i, 'exposure');
  }

  @Patch(':itemId/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: UpdateErcStatusDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.updateStatus(u, j, i, dto.status, 'exposure');
  }

  @Post(':itemId/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.approveItem(u, j, i, 'exposure');
  }

  @Post(':itemId/revisit')
  @HttpCode(HttpStatus.OK)
  revisit(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.revisitItem(u, j, i, 'exposure');
  }

  @Post(':itemId/suggest')
  @HttpCode(HttpStatus.OK)
  suggest(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: SuggestErcDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.suggestItem(u, j, i, dto.text, 'exposure');
  }

  @Delete(':itemId/suggest')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsuggest(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    await this.ercService.unsuggestItem(u, j, i, 'exposure');
  }

  @Post(':itemId/sidenote/acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledgeSidenote(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.acknowledgeSidenoteItem(u, j, i, 'exposure');
  }

  @Post(':itemId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.deactivate(u, j, i, 'exposure');
  }

  @Post(':itemId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.reactivate(u, j, i, 'exposure');
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    await this.ercService.remove(u, j, i, 'exposure');
  }
}

// ─── Resolutions ──────────────────────────────────────────────────────────────

@Controller('journeys/:journeyId/resolutions')
@UseGuards(SessionGuard)
export class ResolutionsController {
  constructor(public readonly ercService: ErcService) {}

  @Get('pool')
  getPool(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) {
    return this.ercService.getPool(u, j, 'resolution');
  }

  @Get()
  list(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) {
    return this.ercService.listItems(u, j, 'resolution');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  select(@Param('journeyId') j: string, @Body() dto: SelectErcDto, @CurrentUser() u: SessionUser) {
    return this.ercService.selectItem(u, j, dto.poolItemId, 'resolution');
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  createCustom(
    @Param('journeyId') j: string,
    @Body() dto: CreateCustomResolutionDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.createCustomItem(u, j, dto, 'resolution');
  }

  @Patch(':itemId')
  @HttpCode(HttpStatus.OK)
  editCustom(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: EditCustomErcDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.editCustomItem(u, j, i, dto, 'resolution');
  }

  @Post(':itemId/submit-for-review')
  @HttpCode(HttpStatus.OK)
  submitForReview(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.submitForReview(u, j, i, 'resolution');
  }

  @Patch(':itemId/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: UpdateErcStatusDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.updateStatus(u, j, i, dto.status, 'resolution');
  }

  @Post(':itemId/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.approveItem(u, j, i, 'resolution');
  }

  @Post(':itemId/revisit')
  @HttpCode(HttpStatus.OK)
  revisit(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.revisitItem(u, j, i, 'resolution');
  }

  @Post(':itemId/suggest')
  @HttpCode(HttpStatus.OK)
  suggest(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: SuggestErcDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.suggestItem(u, j, i, dto.text, 'resolution');
  }

  @Delete(':itemId/suggest')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsuggest(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    await this.ercService.unsuggestItem(u, j, i, 'resolution');
  }

  @Post(':itemId/sidenote/acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledgeSidenote(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.acknowledgeSidenoteItem(u, j, i, 'resolution');
  }

  @Post(':itemId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.deactivate(u, j, i, 'resolution');
  }

  @Post(':itemId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.reactivate(u, j, i, 'resolution');
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    await this.ercService.remove(u, j, i, 'resolution');
  }
}

// ─── Challenges ───────────────────────────────────────────────────────────────

@Controller('journeys/:journeyId/challenges')
@UseGuards(SessionGuard)
export class ChallengesController {
  constructor(public readonly ercService: ErcService) {}

  @Get('pool')
  getPool(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) {
    return this.ercService.getPool(u, j, 'challenge');
  }

  @Get()
  list(@Param('journeyId') j: string, @CurrentUser() u: SessionUser) {
    return this.ercService.listItems(u, j, 'challenge');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  select(@Param('journeyId') j: string, @Body() dto: SelectErcDto, @CurrentUser() u: SessionUser) {
    return this.ercService.selectItem(u, j, dto.poolItemId, 'challenge');
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  createCustom(
    @Param('journeyId') j: string,
    @Body() dto: CreateCustomChallengeDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.createCustomItem(u, j, dto, 'challenge');
  }

  @Patch(':itemId')
  @HttpCode(HttpStatus.OK)
  editCustom(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: EditCustomErcDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.editCustomItem(u, j, i, dto, 'challenge');
  }

  @Post(':itemId/submit-for-review')
  @HttpCode(HttpStatus.OK)
  submitForReview(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.submitForReview(u, j, i, 'challenge');
  }

  @Patch(':itemId/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: UpdateErcStatusDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.updateStatus(u, j, i, dto.status, 'challenge');
  }

  @Post(':itemId/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.approveItem(u, j, i, 'challenge');
  }

  @Post(':itemId/revisit')
  @HttpCode(HttpStatus.OK)
  revisit(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.revisitItem(u, j, i, 'challenge');
  }

  @Post(':itemId/suggest')
  @HttpCode(HttpStatus.OK)
  suggest(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @Body() dto: SuggestErcDto,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.suggestItem(u, j, i, dto.text, 'challenge');
  }

  @Delete(':itemId/suggest')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsuggest(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    await this.ercService.unsuggestItem(u, j, i, 'challenge');
  }

  @Post(':itemId/sidenote/acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledgeSidenote(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.acknowledgeSidenoteItem(u, j, i, 'challenge');
  }

  @Post(':itemId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.deactivate(u, j, i, 'challenge');
  }

  @Post(':itemId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    return this.ercService.reactivate(u, j, i, 'challenge');
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('journeyId') j: string,
    @Param('itemId') i: string,
    @CurrentUser() u: SessionUser,
  ) {
    await this.ercService.remove(u, j, i, 'challenge');
  }
}
