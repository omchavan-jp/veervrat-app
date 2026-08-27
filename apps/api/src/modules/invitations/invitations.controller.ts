import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { SendInvitationDto } from './dto/send-invitation.dto';

@Controller('invitations')
@UseGuards(SessionGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * ⚠️ ORDERING. Both static GETs below are declared BEFORE `:token`, and must stay that way.
   *
   * Nest matches routes in registration order, and `GET :token` lives in
   * `PublicInvitationsController`. If that controller is listed FIRST in the module's
   * `controllers` array, "received" is read as an invitation token: the endpoint 404s on a URL
   * that looks entirely correct, with nothing in the logs to suggest why.
   *
   * Pinned by a test in `invitations-received.integration.spec.ts` rather than by this comment,
   * because reordering an array is the most innocent-looking edit there is.
   */
  @Get('received')
  async received(@CurrentUser() user: SessionUser) {
    return this.invitationsService.listReceived(user);
  }

  @Post()
  @HttpCode(201)
  sendVmInvitation(@CurrentUser() user: SessionUser, @Body() dto: SendInvitationDto) {
    return this.invitationsService.sendVmInvitation(user, dto);
  }

  @Post(':token/accept')
  @HttpCode(200)
  acceptInvitation(@CurrentUser() user: SessionUser, @Param('token') token: string) {
    return this.invitationsService.acceptInvitation(user, token);
  }

  @Post(':token/decline')
  @HttpCode(200)
  declineInvitation(@CurrentUser() user: SessionUser, @Param('token') token: string) {
    return this.invitationsService.declineInvitation(user, token);
  }

  @Post(':id/reminder')
  @HttpCode(200)
  sendReminder(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.invitationsService.sendReminder(user, id);
  }

  @Delete(':id')
  @HttpCode(200)
  cancelInvitation(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.invitationsService.cancelInvitation(user, id);
  }

  @Get()
  listInvitations(@CurrentUser() user: SessionUser) {
    return this.invitationsService.listInvitations(user);
  }
}
