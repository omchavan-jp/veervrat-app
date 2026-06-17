import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { AdminContentRepository } from './admin-content.repository';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';
import { AdminShlokasController } from './admin-shlokas.controller';
import { AdminShlokasService } from './admin-shlokas.service';
import { AdminPothiController } from './admin-pothi.controller';
import { AdminPothiService } from './admin-pothi.service';
import { AdminResourcesController } from './admin-resources.controller';
import { AdminResourcesService } from './admin-resources.service';

@Module({
  imports: [AuthModule, ContentModule],
  controllers: [TaxonomyController, AdminShlokasController, AdminPothiController, AdminResourcesController],
  providers: [
    AdminContentRepository,
    TaxonomyService,
    AdminShlokasService,
    AdminPothiService,
    AdminResourcesService,
  ],
})
export class AdminModule {}
