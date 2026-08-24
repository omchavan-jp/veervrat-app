import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { DataExportService } from '../data-export/data-export.service';
import { AuthService } from '../auth/auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto, DeleteAccountDto } from './dto/change-password.dto';
import { authCookieOptions } from '../../common/http/cookie';
import { SessionGuard } from '../auth/guards/session.guard';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Audited } from '../audit/audited.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('users')
export class UsersController {
  private readonly cookieName: string;
  private readonly cookieMaxAgeMs: number;
  private readonly isProduction: boolean;

  constructor(
    private readonly usersService: UsersService,
    private readonly dataExportService: DataExportService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const ttlDays = this.configService.get<number>('SESSION_TTL_DAYS', 30);
    this.cookieName = this.configService.get<string>('SESSION_COOKIE_NAME', 'veervrat_session');
    this.cookieMaxAgeMs = ttlDays * 24 * 60 * 60 * 1000;
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  // Must be before /:username to avoid param swallowing
  @Get('check-username')
  @UseGuards(SessionGuard)
  async checkUsername(@Query('username') username: string, @CurrentUser() user: SessionUser) {
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
  async updateOwnProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: SessionUser) {
    return this.usersService.updateOwnProfile(user.id, dto);
  }

  @Patch('me/visibility')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async updateVisibility(@Body() dto: UpdateVisibilityDto, @CurrentUser() user: SessionUser) {
    return this.usersService.updateVisibility(user.id, dto);
  }

  @Patch('me/settings')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Body() dto: UpdateSettingsDto, @CurrentUser() user: SessionUser) {
    return this.usersService.updateSettings(user.id, dto);
  }

  @Post('me/restart-tour')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async restartTour(@CurrentUser() user: SessionUser) {
    return this.usersService.restartTour(user.id);
  }

  @Patch('me/password')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'auth.password_change',
    resourceType: 'user',
    resourceId: (c) => (c.req.user as SessionUser)?.id,
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessionToken } = await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    res.cookie(
      this.cookieName,
      sessionToken,
      authCookieOptions({ httpOnly: true, maxAgeMs: this.cookieMaxAgeMs }),
    );
    return { success: true };
  }

  /**
   * Every category of personal data this account holds, as one JSON document.
   *
   * Self-service rather than an admin-only tool: the alternative is a manual database query by
   * whoever holds prod credentials for every request, and the published privacy policy already
   * says "you can ask what data we hold about you" — this is what makes that answerable without
   * a person in the loop.
   *
   * Throttled hard. This is the heaviest read in the API by design — it touches nearly every
   * table the account appears in — and unlike most rate limits here, the purpose is capacity
   * protection rather than brute-force defence.
   */
  @Get('me/data-export')
  @UseGuards(SessionGuard)
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  @Audited({
    action: 'user.data_export',
    resourceType: 'user',
    resourceId: (c) => (c.req.user as SessionUser)?.id,
  })
  async exportMyData(@CurrentUser() user: SessionUser) {
    return this.dataExportService.exportFor(user.id);
  }

  @Get('me/connected-accounts')
  @UseGuards(SessionGuard)
  async listConnectedAccounts(@CurrentUser() user: SessionUser) {
    return this.authService.listConnectedAccounts(user.id);
  }

  @Delete('me/connected-accounts/:provider')
  @UseGuards(SessionGuard)
  @Audited({
    action: 'auth.disconnect_account',
    resourceType: 'user',
    resourceId: (c) => (c.req.user as SessionUser)?.id,
    metadata: (c) => ({ provider: c.params.provider }),
  })
  async disconnectAccount(@Param('provider') provider: string, @CurrentUser() user: SessionUser) {
    return this.authService.disconnectAccount(user.id, provider.toUpperCase() as AuthProvider);
  }

  @Delete('me')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'user.self_delete',
    resourceType: 'user',
    resourceId: (c) => (c.req.user as SessionUser)?.id,
  })
  async deleteAccount(
    @Body() dto: DeleteAccountDto,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.selfDelete(user.id, dto.currentPassword);
    // Same scope as it was set with, domain included — otherwise the cookie survives account
    // deletion and the browser keeps presenting a session for a user that no longer exists.
    res.clearCookie(this.cookieName, authCookieOptions({ httpOnly: true }));
    return result;
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
