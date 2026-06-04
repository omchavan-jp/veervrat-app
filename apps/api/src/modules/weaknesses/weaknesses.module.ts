import { Module } from '@nestjs/common';
import { WeaknessesController } from './weaknesses.controller';
import { WeaknessesService } from './weaknesses.service';
import { WeaknessesRepository } from './weaknesses.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WeaknessesController],
  providers: [WeaknessesService, WeaknessesRepository],
  exports: [WeaknessesService],
})
export class WeaknessesModule {}
