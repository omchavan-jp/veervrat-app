// MUST be the first import — instruments the runtime before other modules load.
import './instrument';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { MAX_UPLOAD_MB } from './modules/uploads/uploads.service';
import { configureApp } from './bootstrap';
import { registerShutdownHandlers } from './common/lifecycle/graceful-shutdown';
import { RedisIoAdapter } from './common/websocket/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Images arrive base64-encoded inside a JSON body, and base64 inflates by 4/3 — so a 10MB
    // file is a ~13.4MB request. Express defaults to 100kb, which rejected every realistic
    // photo before the uploads service (and its friendly 413) ever ran, surfacing as a bare 500.
    // Derived from MAX_UPLOAD_MB so the advertised limit and the enforced one cannot drift.
  });
  const bodyLimit = `${Math.ceil(MAX_UPLOAD_MB * (4 / 3)) + 2}mb`;
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { limit: bodyLimit, extended: true });

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
