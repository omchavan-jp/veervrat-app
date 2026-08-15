import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INestApplicationContext } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.provider';

const createAdapter = vi.hoisted(() => vi.fn(() => 'redis-adapter'));
vi.mock('@socket.io/redis-adapter', () => ({ createAdapter }));

const createIOServer = vi.hoisted(() => vi.fn());
vi.mock('@nestjs/platform-socket.io', () => ({
  IoAdapter: class {
    constructor(_app: unknown) {}
    createIOServer(port: number, options?: unknown) {
      return createIOServer(port, options);
    }
  },
}));

// `vi.mock` is hoisted above this import, so the stubbed base class is the one extended.
import { RedisIoAdapter } from './redis-io.adapter';

function makeRedis() {
  const client = {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn(() => makeRedis()),
  };
  return client;
}

describe('RedisIoAdapter', () => {
  let app: INestApplicationContext;
  let appGet: ReturnType<typeof vi.fn>;
  let client: ReturnType<typeof makeRedis>;
  let server: { adapter: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    client = makeRedis();
    appGet = vi.fn(() => client);
    app = { get: appGet } as unknown as INestApplicationContext;
    server = { adapter: vi.fn() };
    createIOServer.mockReturnValue(server);
  });

  it('installs the Redis adapter on the server', () => {
    new RedisIoAdapter(app).createIOServer(3001);

    expect(server.adapter).toHaveBeenCalledWith('redis-adapter');
  });

  it('resolves the shared client from the DI container', () => {
    new RedisIoAdapter(app).createIOServer(3001);

    expect(appGet).toHaveBeenCalledWith(REDIS_CLIENT);
  });

  it('duplicates the client twice rather than reusing it', () => {
    new RedisIoAdapter(app).createIOServer(3001);

    // A connection in subscriber mode cannot issue other commands, so pub and sub must be
    // separate connections — and neither may be the shared client, which is still needed for
    // lockout counters and rate limits.
    expect(client.duplicate).toHaveBeenCalledTimes(2);
    const [pub, sub] = createAdapter.mock.calls[0] as unknown[];
    expect(pub).not.toBe(sub);
    expect(pub).not.toBe(client);
    expect(sub).not.toBe(client);
  });

  it('connects both clients eagerly', () => {
    new RedisIoAdapter(app).createIOServer(3001);

    // The shared client uses lazyConnect, so nothing has opened a socket yet. An unconnected
    // pub/sub pair fails silently — the exact failure this adapter exists to remove.
    const [pub, sub] = createAdapter.mock.calls[0] as Array<ReturnType<typeof makeRedis>>;
    expect(pub.connect).toHaveBeenCalledOnce();
    expect(sub.connect).toHaveBeenCalledOnce();
  });

  it('passes the port and options through to the base adapter', () => {
    const options = { cors: { origin: 'http://localhost:3000' } };
    new RedisIoAdapter(app).createIOServer(3001, options as never);

    // Gateway CORS and auth config must survive the override.
    expect(createIOServer).toHaveBeenCalledWith(3001, options);
  });

  it('quits both clients on shutdown', async () => {
    const adapter = new RedisIoAdapter(app);
    adapter.createIOServer(3001);
    const [pub, sub] = createAdapter.mock.calls[0] as Array<ReturnType<typeof makeRedis>>;

    await adapter.closeRedisConnections();

    expect(pub.quit).toHaveBeenCalledOnce();
    expect(sub.quit).toHaveBeenCalledOnce();
  });

  it('does not throw when closing before a server was created', async () => {
    await expect(new RedisIoAdapter(app).closeRedisConnections()).resolves.toBeUndefined();
  });
});
