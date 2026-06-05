import { Module } from '@nestjs/common';
import { JourneysController } from './journeys.controller';
import { JourneysService } from './journeys.service';
import { JourneysRepository } from './journeys.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [JourneysController],
  providers: [JourneysService, JourneysRepository],
  exports: [JourneysService, JourneysRepository],
})
export class JourneysModule {}
