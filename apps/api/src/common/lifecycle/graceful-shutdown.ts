export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

export interface ShutdownLogger {
  log(message: string): void;
  error(message: unknown): void;
}

export interface ShutdownTarget {
  /** Drains in-flight requests and runs Nest's onModuleDestroy / onApplicationShutdown hooks. */
  close(): Promise<void>;
}

export interface ShutdownOptions {
  /** Extra connections not owned by the Nest container (e.g. Socket.IO adapter pub/sub clients). */
  onClosed?: () => Promise<void>;
  timeoutMs?: number;
  /** Injectable for tests; defaults to terminating the process. */
  exit?: (code: number) => void;
}

export function resolveShutdownTimeoutMs(raw = process.env.SHUTDOWN_TIMEOUT_MS): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SHUTDOWN_TIMEOUT_MS;
}

/**
 * Container platforms replace a revision by sending SIGTERM, waiting a grace period, then
 * SIGKILL. Unhandled, the process is killed mid-request — so every deploy surfaces errors to
 * whoever is using the app at that moment.
 *
 * `app.enableShutdownHooks()` does the graceful part. This adds the bound: `close()` waits on
 * handlers indefinitely, so one hung handler would hold the container open until SIGKILL —
 * precisely the outcome graceful shutdown exists to prevent.
 */
export function registerShutdownHandlers(
  app: ShutdownTarget,
  logger: ShutdownLogger,
  options: ShutdownOptions = {},
): void {
  const timeoutMs = options.timeoutMs ?? resolveShutdownTimeoutMs();
  const exit = options.exit ?? ((code: number) => process.exit(code));
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    // Orchestrators may re-send the signal; re-entering would close twice and race.
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`${signal} received — shutting down gracefully`);

    const forceExit = setTimeout(() => {
      logger.error(`Graceful shutdown exceeded ${timeoutMs}ms — forcing exit`);
      exit(1);
    }, timeoutMs);
    // The timer must not itself be a reason the event loop stays alive.
    forceExit.unref?.();

    void app
      .close()
      .then(() => options.onClosed?.())
      .then(() => {
        clearTimeout(forceExit);
        logger.log('Shutdown complete');
        exit(0);
      })
      .catch((err: Error) => {
        clearTimeout(forceExit);
        logger.error({ msg: 'Error during shutdown', error: err.message });
        exit(1);
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
