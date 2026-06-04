import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WeaknessesService } from './weaknesses.service';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('weaknesses')
@UseGuards(OptionalSessionGuard)
export class WeaknessesController {
  constructor(private readonly weaknessesService: WeaknessesService) {}

  @Get()
  async list(@Req() req: Request) {
    const user = (req.user as SessionUser | undefined) ?? undefined;
    return this.weaknessesService.listWeaknesses(user);
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Req() req: Request) {
    const user = (req.user as SessionUser | undefined) ?? undefined;
    return this.weaknessesService.getWeakness(id, user);
  }
}
