import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';
import { PlatformStats, StatsRepository } from './stats.repository';

const PLATFORM_STATS_KEY = 'platform:stats';
// 60-minute cache (spec/decisions/11_platform-stats.md — stats are approximate, refreshed hourly).
const PLATFORM_STATS_TTL = 3600;

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly statsRepository: StatsRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const cached = await this.redis.get(PLATFORM_STATS_KEY);
      if (cached) {
        return JSON.parse(cached) as PlatformStats;
      }
    } catch (err) {
      this.logger.warn({
        msg: 'Redis get failed for platform stats, falling back to DB',
        error: (err as Error).message,
      });
    }

    const stats = await this.statsRepository.getPlatformStats();

    try {
      await this.redis.set(PLATFORM_STATS_KEY, JSON.stringify(stats), 'EX', PLATFORM_STATS_TTL);
    } catch (err) {
      this.logger.warn({
        msg: 'Redis set failed for platform stats',
        error: (err as Error).message,
      });
    }

    return stats;
  }
}
