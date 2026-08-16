// MUST be the first import — instruments the runtime before other modules load.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { registerShutdownHandlers } from './common/lifecycle/graceful-shutdown';
import { RedisIoAdapter } from './common/websocket/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  configureApp(app);

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // Without Redis (local dev, tests) the default in-memory adapter is correct — a single
  // process needs no backplane.
  let redisAdapter: RedisIoAdapter | undefined;
  if (process.env.REDIS_URL) {
    redisAdapter = new RedisIoAdapter(app);
    app.useWebSocketAdapter(redisAdapter);
  } else {
    logger.warn('REDIS_URL not set — Socket.IO using the in-memory adapter (single replica only)');
  }

  registerShutdownHandlers(app, logger, {
    onClosed: () => redisAdapter?.closeRedisConnections() ?? Promise.resolve(),
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
