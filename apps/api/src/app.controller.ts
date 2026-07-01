import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type Redis from 'ioredis';
import { PrismaService } from './prisma/prisma.service';
import { REDIS_CLIENT } from './common/redis/redis.provider';
import { SkipCsrf } from './common/guards/csrf.guard';

@SkipThrottle()
@SkipCsrf()
@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Liveness: process is up and responding. Cheap, no dependency checks — for
  // "is the container alive" probes that should NOT flap on a transient DB blip.
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Readiness: can this instance actually serve traffic? Pings DB + Redis and
  // returns 503 if either is down, so an orchestrator stops routing to a broken
  // instance instead of the old stub that reported "ok" during an outage.
  @Get('ready')
  async ready() {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const ok = db && redis;
    const body = {
      status: ok ? 'ok' : 'degraded',
      checks: {
        database: db ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
      },
    };
    if (!ok) throw new ServiceUnavailableException(body);
    return body;
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
