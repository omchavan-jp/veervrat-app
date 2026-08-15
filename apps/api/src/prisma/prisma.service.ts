import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULT_POOL_MAX = 10;

/**
 * Connections are per-replica, so the limit that matters is the product:
 * `DATABASE_POOL_MAX × maxReplicas + headroom ≤ server max_connections`. Managed Postgres
 * (notably Flexible Server on Burstable tiers) allows far fewer connections than the count
 * a few replicas will happily open, and exhaustion is a cliff rather than a slope — once
 * the server refuses connections every request fails at once, including the health probes
 * the platform would otherwise use to recover the service.
 */
export function resolvePoolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (!raw) return DEFAULT_POOL_MAX;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_MAX;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg(
      { connectionString: process.env.DATABASE_URL!, max: resolvePoolMax() },
      {
        // Pool-level errors arrive outside any request, so without a handler an idle client
        // dropped by the server (or a failover) surfaces as an unhandled rejection that takes
        // the process down.
        onPoolError: (err) =>
          PrismaService.logger.error({ msg: 'pg pool error', error: err.message }),
        onConnectionError: (err) =>
          PrismaService.logger.warn({ msg: 'pg connection error', error: err.message }),
      },
    );
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
