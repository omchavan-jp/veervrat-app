import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { InvitationsService } from './invitations.service';

/**
 * Reads one invitation by token, for the page where it is accepted.
 *
 * A separate controller from `InvitationsController` for the same reason `UploadsResolver` is
 * separate from `UploadsController`: that one carries a class-level `SessionGuard`, and this
 * route must be reachable **without** a session. The person holding an invitation link may not
 * have an account yet — which is exactly why the accept page could not say who was asking, and
 * why someone was asked to accept a mentoring relationship with an unnamed person (#222).
 *
 * ⚠️ REGISTRATION ORDER. `GET :token` here collides with `GET received` in
 * `InvitationsController`. Nest matches in registration order, so `InvitationsController` must be
 * listed FIRST in the module's `controllers` array — otherwise "received" is read as a token and
 * 404s on a correct-looking URL. Guarded by a test, not by this comment.
 *
 * Reachable without a session is not the same as unguarded: what it returns is deliberately thin
 * (see `getByTokenForDisplay`), and a missing invitation is indistinguishable from an expired one
 * so the endpoint cannot be used to find out which tokens are real.
 */
@Controller('invitations')
@UseGuards(OptionalSessionGuard)
export class PublicInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // Throttled: cheap to call, and it identifies a person.
  @Get(':token')
  @Throttle({ default: { ttl: 3600000, limit: 60 } })
  async byToken(@Param('token') token: string) {
    return this.invitationsService.getByTokenForDisplay(token);
  }
}
