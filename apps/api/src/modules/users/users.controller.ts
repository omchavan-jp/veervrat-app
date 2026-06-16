import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Must be before /:username to avoid param swallowing
  @Get('check-username')
  @UseGuards(SessionGuard)
  async checkUsername(
    @Query('username') username: string,
    @CurrentUser() user: SessionUser,
  ) {
    if (!username) return { available: false };
    const available = await this.usersService.checkUsernameAvailable(username, user.id);
    return { available };
  }

  // Before /:username so "search" isn't swallowed as a username param.
  @Get('search')
  @UseGuards(SessionGuard)
  async search(@Query('q') q: string, @CurrentUser() user: SessionUser) {
    return this.usersService.searchUsers(user, q ?? '');
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async getOwnProfile(@CurrentUser() user: SessionUser) {
    return this.usersService.getOwnProfile(user.id);
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async updateOwnProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.updateOwnProfile(user.id, dto);
  }

  @Patch('me/visibility')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async updateVisibility(
    @Body() dto: UpdateVisibilityDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.updateVisibility(user.id, dto);
  }

  // Declared before :username so it is matched first.
  @Get(':username/experience-logs')
  @UseGuards(OptionalSessionGuard)
  async getPublicExperiences(
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.usersService.getPublicExperiences(username, cursor);
  }

  @Get(':username')
  @UseGuards(OptionalSessionGuard)
  async getPublicProfile(
    @Param('username') username: string,
    @CurrentUser() user: SessionUser | undefined,
  ) {
    return this.usersService.getPublicProfile(username, user?.id);
  }
}
