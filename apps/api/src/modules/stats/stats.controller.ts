import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // Guest-accessible (spec/decisions/11_platform-stats.md) — no SessionGuard.
  @Get('platform')
  @HttpCode(HttpStatus.OK)
  async getPlatformStats() {
    return this.statsService.getPlatformStats();
  }
}
