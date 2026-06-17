import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersRepository } from './admin-users.repository';

@Module({
  imports: [AuthModule, JourneysModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminUsersRepository],
})
export class AdminUsersModule {}
