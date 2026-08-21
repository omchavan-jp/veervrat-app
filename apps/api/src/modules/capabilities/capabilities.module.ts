import { Global, Module } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { CapabilitiesRepository } from './capabilities.repository';

// Global: capability checks belong wherever a gated feature lives, and threading this module
// through every consumer's imports would be noise.
@Global()
@Module({
  providers: [CapabilitiesService, CapabilitiesRepository],
  exports: [CapabilitiesService, CapabilitiesRepository],
})
export class CapabilitiesModule {}
