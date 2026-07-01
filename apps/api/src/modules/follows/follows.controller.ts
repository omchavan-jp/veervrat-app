import { Controller, Post, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('users/:username/follow')
@UseGuards(SessionGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async follow(@Param('username') username: string, @CurrentUser() user: SessionUser) {
    return this.followsService.follow(user, username);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async unfollow(@Param('username') username: string, @CurrentUser() user: SessionUser) {
    return this.followsService.unfollow(user, username);
  }
}
