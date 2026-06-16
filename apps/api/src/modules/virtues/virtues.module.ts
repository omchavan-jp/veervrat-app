import { Module } from '@nestjs/common';
import { VirtuesController } from './virtues.controller';
import { VirtuesService } from './virtues.service';
import { VirtuesRepository } from './virtues.repository';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';

@Module({
  imports: [AuthModule, JourneysModule],
  controllers: [VirtuesController],
  providers: [VirtuesService, VirtuesRepository],
})
export class VirtuesModule {}
