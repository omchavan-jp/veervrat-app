import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { PublicInvitationsController } from './public-invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './invitations.repository';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { JourneysModule } from '../journeys/journeys.module';
import { UsersModule } from '../users/users.module';
import { VmRelationshipsModule } from '../vm-relationships/vm-relationships.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    EmailModule,
    JourneysModule,
    UsersModule,
    VmRelationshipsModule,
    NotificationsModule,
  ],
  // ⚠️ ORDER MATTERS. InvitationsController declares `GET received`; PublicInvitationsController
  // declares `GET :token`. Nest matches in registration order, so swapping these makes "received"
  // parse as a token and 404. Guarded by invitations-received.integration.spec.ts.
  controllers: [InvitationsController, PublicInvitationsController],
  providers: [InvitationsService, InvitationsRepository],
  exports: [InvitationsService],
})
export class InvitationsModule {}
