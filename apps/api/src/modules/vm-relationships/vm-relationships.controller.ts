import { Controller, Delete, HttpCode, Param, UseGuards } from '@nestjs/common';
import { VmRelationshipsService } from './vm-relationships.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller()
@UseGuards(SessionGuard)
export class VmRelationshipsController {
  constructor(private readonly vmRelationshipsService: VmRelationshipsService) {}

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
