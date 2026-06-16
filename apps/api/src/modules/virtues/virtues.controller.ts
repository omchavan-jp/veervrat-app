import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VirtuesService } from './virtues.service';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

// All read-only and guest-accessible (spec/09, spec/21) — OptionalSessionGuard so an
// authenticated VA additionally gets the sentence active-journey indicator.
@Controller()
@UseGuards(OptionalSessionGuard)
export class VirtuesController {
  constructor(private readonly virtuesService: VirtuesService) {}

  @Get('virtues')
  getVirtues() {
    return this.virtuesService.getVirtues();
  }

  @Get('virtues/:id')
  getVirtue(@Param('id') id: string) {
    return this.virtuesService.getVirtue(id);
  }

  @Get('subvirtues/:id')
  getSubvirtue(@Param('id') id: string) {
    return this.virtuesService.getSubvirtue(id);
  }

  @Get('sentences/:id')
  getSentence(@CurrentUser() user: SessionUser | undefined, @Param('id') id: string) {
    return this.virtuesService.getSentence(user, id);
  }
}
