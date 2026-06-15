import { Module, forwardRef } from '@nestjs/common';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { FollowsRepository } from './follows.repository';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, forwardRef(() => UsersModule), NotificationsModule],
  controllers: [FollowsController],
  providers: [FollowsService, FollowsRepository],
  exports: [FollowsService],
})
export class FollowsModule {}
