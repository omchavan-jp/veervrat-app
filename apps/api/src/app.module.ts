import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigModule } from './config/config.module';
import { AppController } from './app.controller';

@Module({
  imports: [AppConfigModule, PrismaModule],
  controllers: [AppController],
})
export class AppModule {}
