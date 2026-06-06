import { Injectable, Inject, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';
import { DashboardRepository, DashboardStats, SuggestionItem, PlatformStats } from './dashboard.repository';

const PLATFORM_STATS_KEY = 'platform:stats';
const PLATFORM_STATS_TTL = 3600;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dashboardRepository: DashboardRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getStats(userId: string): Promise<DashboardStats> {
    return this.dashboardRepository.getStats(userId);
  }

  async getSuggestions(userId: string): Promise<{ suggestions: SuggestionItem[] }> {
    const suggestions = await this.dashboardRepository.getSuggestions(userId);
    return { suggestions };
  }

  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const cached = await this.redis.get(PLATFORM_STATS_KEY);
      if (cached) {
        return JSON.parse(cached) as PlatformStats;
      }
    } catch (err) {
      this.logger.warn({ msg: 'Redis get failed for platform stats, falling back to DB', error: (err as Error).message });
    }

    const stats = await this.dashboardRepository.getPlatformStats();

    try {
      await this.redis.set(PLATFORM_STATS_KEY, JSON.stringify(stats), 'EX', PLATFORM_STATS_TTL);
    } catch (err) {
      this.logger.warn({ msg: 'Redis set failed for platform stats', error: (err as Error).message });
    }

    return stats;
  }
}
