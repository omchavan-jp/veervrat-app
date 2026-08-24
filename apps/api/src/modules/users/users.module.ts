import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { AuthModule } from '../auth/auth.module';
import { FollowsModule } from '../follows/follows.module';
import { ExperienceLogsModule } from '../experience-logs/experience-logs.module';
import { DataExportModule } from '../data-export/data-export.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => FollowsModule),
    forwardRef(() => ExperienceLogsModule),
    DataExportModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
