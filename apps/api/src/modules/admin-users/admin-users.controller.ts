import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import {
  AnonymiseUserDto,
  OverrideJourneyStateDto,
  SuspendUserDto,
  UpdateCapabilitiesDto,
  UpdateRolesDto,
} from './dto/admin-users.dto';

@Controller()
@UseGuards(SessionGuard)
export class AdminUsersController {
  constructor(private readonly admin: AdminUsersService) {}

  @Get('admin/users')
  list(@CurrentUser() user: SessionUser, @Query('cursor') cursor?: string, @Query('q') q?: string) {
    return this.admin.list(user, cursor, q);
  }

  @Get('admin/users/:id')
  getDetail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.admin.getDetail(user, id);
  }

  @Patch('admin/users/:id/roles')
  @Audited({
    action: 'admin.manage_user_role',
    resourceType: 'user',
    resourceIdParam: 'id',
    metadata: (c) => ({
      added: (c.body as UpdateRolesDto)?.add ?? [],
      removed: (c.body as UpdateRolesDto)?.remove ?? [],
    }),
  })
  updateRoles(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateRolesDto,
  ) {
    return this.admin.updateRoles(user, id, dto);
  }

  @Patch('admin/users/:id/capabilities')
  @Audited({
    action: 'admin.manage_user_capabilities',
    resourceType: 'user',
    resourceIdParam: 'id',
    metadata: (c) => ({
      added: (c.body as UpdateCapabilitiesDto)?.add ?? [],
      removed: (c.body as UpdateCapabilitiesDto)?.remove ?? [],
    }),
  })
  updateCapabilities(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateCapabilitiesDto,
  ) {
    return this.admin.updateCapabilities(user, id, dto);
  }

  @Post('admin/users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'admin.suspend_user',
    resourceType: 'user',
    resourceIdParam: 'id',
    metadata: (c) => ({ suspended: (c.body as SuspendUserDto)?.suspended }),
  })
  suspend(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: SuspendUserDto) {
    return this.admin.setSuspended(user, id, dto.suspended);
  }

  @Post('admin/users/:id/force-logout')
  @HttpCode(HttpStatus.OK)
  @Audited({ action: 'admin.force_logout', resourceType: 'user', resourceIdParam: 'id' })
  forceLogout(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.admin.forceLogout(user, id);
  }

  @Post('admin/users/:id/anonymise')
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'admin.anonymise_user',
    resourceType: 'user',
    resourceIdParam: 'id',
    metadata: (c) => ({ reason: (c.body as AnonymiseUserDto)?.reason }),
  })
  anonymise(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: AnonymiseUserDto,
  ) {
    return this.admin.anonymise(user, id, dto);
  }

  @Patch('admin/journeys/:id/state')
  @Audited({
    action: 'admin.override_journey_state',
    resourceType: 'journey',
    resourceIdParam: 'id',
    metadata: (c) => {
      const r = c.result as { from?: string; to?: string } | undefined;
      return {
        from_state: r?.from,
        to_state: r?.to,
        reason: (c.body as OverrideJourneyStateDto)?.reason,
      };
    },
  })
  overrideJourneyState(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: OverrideJourneyStateDto,
  ) {
    return this.admin.overrideJourneyState(user, id, dto);
  }
}
