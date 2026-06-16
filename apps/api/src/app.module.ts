import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { UsersModule } from './modules/users/users.module';
import { WeaknessesModule } from './modules/weaknesses/weaknesses.module';
import { TestsModule } from './modules/tests/tests.module';
import { JourneysModule } from './modules/journeys/journeys.module';
import { ErcModule } from './modules/erc/erc.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { VmRelationshipsModule } from './modules/vm-relationships/vm-relationships.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ChatsModule } from './modules/chats/chats.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EntitySearchModule } from './modules/entity-search/entity-search.module';
import { ActionsModule } from './modules/actions/actions.module';
import { ExperienceLogsModule } from './modules/experience-logs/experience-logs.module';
import { FollowsModule } from './modules/follows/follows.module';
import { SearchModule } from './modules/search/search.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { VirtuesModule } from './modules/virtues/virtues.module';
import { RedisModule } from './common/redis/redis.module';
import { AppController } from './app.controller';
import { Reflector } from '@nestjs/core';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { CsrfGuard } from './common/guards/csrf.guard';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 300 }]),
    // forRootAsync defers env reads until after AppConfigModule/dotenv has loaded
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          autoLogging: false,
          redact: ['req.headers.cookie', 'req.body.password'],
          level: process.env.LOG_LEVEL ?? 'info',
          transport:
            process.env.NODE_ENV !== 'production'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    EmailModule,
    UsersModule,
    WeaknessesModule,
    TestsModule,
    JourneysModule,
    ErcModule,
    InvitationsModule,
    VmRelationshipsModule,
    NotificationsModule,
    DashboardModule,
    ChatsModule,
    UploadsModule,
    EntitySearchModule,
    ActionsModule,
    ExperienceLogsModule,
    FollowsModule,
    SearchModule,
    BlogsModule,
    VirtuesModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new CsrfGuard(reflector),
      inject: [Reflector],
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, CsrfMiddleware).forRoutes('*');
  }
}
