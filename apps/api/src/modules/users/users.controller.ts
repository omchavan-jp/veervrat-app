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
import { SessionGuard } from '../auth/guards/session.guard';
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

  @Get(':username')
  async getPublicProfile(
    @Param('username') username: string,
    @CurrentUser() user: SessionUser | undefined,
  ) {
    return this.usersService.getPublicProfile(username, user?.id);
  }
}
