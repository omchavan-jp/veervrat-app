import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  registerShutdownHandlers,
  resolveShutdownTimeoutMs,
} from './graceful-shutdown';

function makeLogger() {
  return { log: vi.fn(), error: vi.fn() };
}

describe('resolveShutdownTimeoutMs', () => {
  it('uses the configured value', () => {
    expect(resolveShutdownTimeoutMs('5000')).toBe(5000);
  });

  it.each([undefined, '', 'abc', '0', '-1'])('falls back to the default for %o', (raw) => {
    expect(resolveShutdownTimeoutMs(raw)).toBe(DEFAULT_SHUTDOWN_TIMEOUT_MS);
  });
});

describe('registerShutdownHandlers', () => {
  const listeners: Array<[string, () => void]> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(process, 'on').mockImplementation(((signal: string, handler: () => void) => {
      listeners.push([signal, handler]);
      return process;
    }) as typeof process.on);
  });

  afterEach(() => {
    listeners.length = 0;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const fire = (signal: string) =>
    listeners.filter(([s]) => s === signal).forEach(([, handler]) => handler());

  it('registers handlers for SIGTERM and SIGINT', () => {
    registerShutdownHandlers({ close: vi.fn().mockResolvedValue(undefined) }, makeLogger(), {
      exit: vi.fn(),
    });

    expect(listeners.map(([signal]) => signal)).toEqual(
      expect.arrayContaining(['SIGTERM', 'SIGINT']),
    );
  });

  it('closes the app and exits 0 on SIGTERM', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    registerShutdownHandlers({ close }, makeLogger(), { exit });

    fire('SIGTERM');
    await vi.runAllTimersAsync();

    expect(close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('closes extra connections after the app closes', async () => {
    const order: string[] = [];
    const close = vi.fn().mockImplementation(() => {
      order.push('app');
      return Promise.resolve();
    });
    const onClosed = vi.fn().mockImplementation(() => {
      order.push('extra');
      return Promise.resolve();
    });
    registerShutdownHandlers({ close }, makeLogger(), { onClosed, exit: vi.fn() });

    fire('SIGTERM');
    await vi.runAllTimersAsync();

    // Redis pub/sub clients outlive the Nest container, so they must be closed after it —
    // otherwise they keep the event loop alive and the process never exits.
    expect(order).toEqual(['app', 'extra']);
  });

  it('ignores a repeated signal rather than closing twice', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    registerShutdownHandlers({ close }, makeLogger(), { exit: vi.fn() });

    fire('SIGTERM');
    fire('SIGTERM');
    await vi.runAllTimersAsync();

    expect(close).toHaveBeenCalledOnce();
  });

  it('forces exit when shutdown exceeds the timeout', async () => {
    // A handler that never settles: without the timeout the container would hang until SIGKILL,
    // which is the failure graceful shutdown is supposed to prevent.
    const close = vi.fn().mockReturnValue(new Promise<void>(() => {}));
    const exit = vi.fn();
    const logger = makeLogger();
    registerShutdownHandlers({ close }, logger, { timeoutMs: 1000, exit });

    fire('SIGTERM');
    await vi.advanceTimersByTimeAsync(1000);

    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('1000ms'));
  });

  it('does not force exit when shutdown completes in time', async () => {
    const exit = vi.fn();
    registerShutdownHandlers({ close: vi.fn().mockResolvedValue(undefined) }, makeLogger(), {
      timeoutMs: 1000,
      exit,
    });

    fire('SIGTERM');
    await vi.advanceTimersByTimeAsync(5000);

    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits non-zero when close rejects', async () => {
    const exit = vi.fn();
    const logger = makeLogger();
    registerShutdownHandlers({ close: vi.fn().mockRejectedValue(new Error('boom')) }, logger, {
      exit,
    });

    fire('SIGTERM');
    await vi.runAllTimersAsync();

    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'Error during shutdown', error: 'boom' }),
    );
  });
});
