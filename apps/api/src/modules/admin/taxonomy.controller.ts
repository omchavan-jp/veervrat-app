import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import {
  CreateSubvirtueDto,
  CreateVirtueDto,
  CreateWeaknessDto,
  LinkWeaknessSubvirtueDto,
  UpdateSubvirtueDto,
  UpdateVirtueDto,
  UpdateWeaknessDto,
} from './dto/taxonomy.dto';

@Controller('admin')
@UseGuards(SessionGuard)
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  // ─── Virtues ───────────────────────────────────────────────────────────────
  @Post('virtues')
  @HttpCode(HttpStatus.CREATED)
  @Audited({ action: 'admin.create_virtue', resourceType: 'virtue', resourceId: (c) => (c.result as { id?: string })?.id })
  createVirtue(@CurrentUser() user: SessionUser, @Body() dto: CreateVirtueDto) {
    return this.taxonomy.createVirtue(user, dto);
  }

  @Patch('virtues/:id')
  @Audited({ action: 'admin.update_virtue', resourceType: 'virtue', resourceIdParam: 'id' })
  updateVirtue(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdateVirtueDto) {
    return this.taxonomy.updateVirtue(user, id, dto);
  }

  @Delete('virtues/:id')
  @Audited({ action: 'admin.delete_virtue', resourceType: 'virtue', resourceIdParam: 'id' })
  deleteVirtue(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.taxonomy.deleteVirtue(user, id);
  }

  // ─── Subvirtues ──────────────────────────────────────────────────────────────
  @Post('subvirtues')
  @HttpCode(HttpStatus.CREATED)
  @Audited({ action: 'admin.create_subvirtue', resourceType: 'subvirtue', resourceId: (c) => (c.result as { id?: string })?.id })
  createSubvirtue(@CurrentUser() user: SessionUser, @Body() dto: CreateSubvirtueDto) {
    return this.taxonomy.createSubvirtue(user, dto);
  }

  @Patch('subvirtues/:id')
  @Audited({ action: 'admin.update_subvirtue', resourceType: 'subvirtue', resourceIdParam: 'id' })
  updateSubvirtue(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdateSubvirtueDto) {
    return this.taxonomy.updateSubvirtue(user, id, dto);
  }

  @Delete('subvirtues/:id')
  @Audited({ action: 'admin.delete_subvirtue', resourceType: 'subvirtue', resourceIdParam: 'id' })
  deleteSubvirtue(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.taxonomy.deleteSubvirtue(user, id);
  }

  // ─── Weaknesses ──────────────────────────────────────────────────────────────
  @Post('weaknesses')
  @HttpCode(HttpStatus.CREATED)
  @Audited({ action: 'admin.create_weakness', resourceType: 'weakness', resourceId: (c) => (c.result as { id?: string })?.id })
  createWeakness(@CurrentUser() user: SessionUser, @Body() dto: CreateWeaknessDto) {
    return this.taxonomy.createWeakness(user, dto);
  }

  @Patch('weaknesses/:id')
  @Audited({ action: 'admin.update_weakness', resourceType: 'weakness', resourceIdParam: 'id' })
  updateWeakness(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdateWeaknessDto) {
    return this.taxonomy.updateWeakness(user, id, dto);
  }

  @Delete('weaknesses/:id')
  @Audited({ action: 'admin.delete_weakness', resourceType: 'weakness', resourceIdParam: 'id' })
  deleteWeakness(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.taxonomy.deleteWeakness(user, id);
  }

  // ─── Weakness ↔ Subvirtue links ───────────────────────────────────────────────
  @Post('weakness-subvirtues')
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'admin.link_weakness_subvirtue',
    resourceType: 'weakness_subvirtue',
    resourceId: (c) => (c.body as LinkWeaknessSubvirtueDto)?.weaknessId,
  })
  link(@CurrentUser() user: SessionUser, @Body() dto: LinkWeaknessSubvirtueDto) {
    return this.taxonomy.linkWeaknessSubvirtue(user, dto);
  }

  @Delete('weakness-subvirtues')
  @Audited({ action: 'admin.unlink_weakness_subvirtue', resourceType: 'weakness_subvirtue' })
  unlink(
    @CurrentUser() user: SessionUser,
    @Query('weaknessId') weaknessId: string,
    @Query('subvirtueId') subvirtueId: string,
  ) {
    return this.taxonomy.unlinkWeaknessSubvirtue(user, weaknessId, subvirtueId);
  }
}
