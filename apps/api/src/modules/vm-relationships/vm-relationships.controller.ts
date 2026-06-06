import { Controller, Delete, Get, HttpCode, Param, Query, UseGuards } from '@nestjs/common';
import { VmRelationshipsService } from './vm-relationships.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller()
@UseGuards(SessionGuard)
export class VmRelationshipsController {
  constructor(private readonly vmRelationshipsService: VmRelationshipsService) {}

  @Get('api/v1/vm-relationships/my-vms')
  async getMyVms(
    @CurrentUser() user: SessionUser,
    @Query('scope') scope?: 'GLOBAL' | 'JOURNEY',
  ) {
    const vms = await this.vmRelationshipsService.getMyVms(user, scope);
    return { data: vms };
  }

  @Delete('vm-relationships/global')
  @HttpCode(200)
  removeGlobalVm(@CurrentUser() user: SessionUser) {
    return this.vmRelationshipsService.removeGlobalVm(user);
  }

  @Delete('journeys/:journeyId/vm')
  @HttpCode(200)
  withdrawJourneyVm(
    @CurrentUser() user: SessionUser,
    @Param('journeyId') journeyId: string,
  ) {
    return this.vmRelationshipsService.withdrawJourneyVm(user, journeyId);
  }
}
