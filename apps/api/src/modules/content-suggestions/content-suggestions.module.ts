import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { ContentSuggestionsController } from './content-suggestions.controller';
import { ContentSuggestionsService } from './content-suggestions.service';
import { ContentSuggestionsRepository } from './content-suggestions.repository';

// AuthModule for SessionGuard; CapabilitiesModule for the grant lookup. Prisma is global.
@Module({
  imports: [AuthModule, CapabilitiesModule],
  controllers: [ContentSuggestionsController],
  providers: [ContentSuggestionsService, ContentSuggestionsRepository],
  exports: [ContentSuggestionsService],
})
export class ContentSuggestionsModule {}
