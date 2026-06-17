import { Controller, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessDeniedException } from '../../common/exceptions/app.exceptions';
import { isVa } from '../../common/permissions/types';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('dashboard')
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@CurrentUser() user: SessionUser) {
    if (!isVa(user)) throw new AccessDeniedException();
    return this.dashboardService.getStats(user.id);
  }

  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  async getSuggestions(@CurrentUser() user: SessionUser) {
    if (!isVa(user)) throw new AccessDeniedException();
    return this.dashboardService.getSuggestions(user.id);
  }
}
