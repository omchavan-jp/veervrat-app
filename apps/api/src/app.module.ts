import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { UsersModule } from './modules/users/users.module';
import { RedisModule } from './common/redis/redis.module';
import { AppController } from './app.controller';
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
    PrismaModule,
    RedisModule,
    AuthModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, CsrfMiddleware).forRoutes('*');
  }
}
