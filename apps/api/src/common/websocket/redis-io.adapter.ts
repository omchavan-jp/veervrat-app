import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import type { ServerOptions, Server } from 'socket.io';
import { REDIS_CLIENT } from '../redis/redis.provider';

/**
 * Socket.IO keeps room membership in per-process memory. With more than one replica a message
 * emitted to a room on replica A is delivered only to sockets attached to replica A — clients on
 * replica B receive nothing, and **no error is raised on either side**. In chat that presents as
 * messages arriving for some participants and not others, intermittently, depending on which
 * replica the load balancer happened to route each socket to.
 *
 * The Redis adapter fixes this by publishing broadcasts over Redis pub/sub. It needs two separate
 * connections: a connection in subscriber mode cannot issue any other command, so the publishing
 * side must be its own client.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    const client = this.app.get<Redis>(REDIS_CLIENT);
    // duplicate() copies the connection options without sharing the socket, which is what the
    // adapter needs — the injected client stays free for ordinary commands (lockout counters,
    // rate limits) while these two are dedicated to pub/sub.
    this.pubClient = client.duplicate();
    this.subClient = client.duplicate();

    // The shared client is created with lazyConnect and only warns on error, so nothing has
    // forced a connection yet. Connect explicitly: an unconnected pub/sub pair fails silently,
    // which is the exact failure mode this adapter exists to remove.
    void Promise.all([this.pubClient.connect(), this.subClient.connect()]).catch((err: Error) =>
      this.logger.error({ msg: 'Socket.IO Redis adapter failed to connect', error: err.message }),
    );

    server.adapter(createAdapter(this.pubClient, this.subClient));
    this.logger.log('Socket.IO using Redis adapter (safe for multiple replicas)');

    return server;
  }

  /** Called during graceful shutdown so these connections cannot hold the process open. */
  async closeRedisConnections(): Promise<void> {
    await Promise.allSettled([this.pubClient?.quit(), this.subClient?.quit()]);
  }
}
