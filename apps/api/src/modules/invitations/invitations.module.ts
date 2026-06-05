import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './invitations.repository';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { JourneysModule } from '../journeys/journeys.module';
import { UsersModule } from '../users/users.module';
import { VmRelationshipsModule } from '../vm-relationships/vm-relationships.module';

@Module({
  imports: [AuthModule, EmailModule, JourneysModule, UsersModule, VmRelationshipsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationsRepository],
  exports: [InvitationsService],
})
export class InvitationsModule {}
