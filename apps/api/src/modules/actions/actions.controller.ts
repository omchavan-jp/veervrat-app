import { Controller, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller()
@UseGuards(SessionGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get('actions')
  @HttpCode(HttpStatus.OK)
  async getVaActions(@CurrentUser() user: SessionUser) {
    return this.actionsService.getVaActions(user);
  }

  @Get('vm-actions')
  @HttpCode(HttpStatus.OK)
  async getVmActions(@CurrentUser() user: SessionUser) {
    return this.actionsService.getVmActions(user);
  }
}
