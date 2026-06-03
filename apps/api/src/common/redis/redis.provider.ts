import { FactoryProvider, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: FactoryProvider<Redis> = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    const logger = new Logger('RedisProvider');
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const client = new Redis(url, { lazyConnect: true });

    client.on('error', (err: Error) => {
      logger.warn({ msg: 'Redis connection error', error: err.message });
    });

    return client;
  },
};
