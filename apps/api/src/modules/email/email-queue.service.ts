import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type JobsOptions } from 'bullmq';
import { EmailService } from './email.service';

export const EMAIL_QUEUE_NAME = 'email';

/**
 * ⚠️ The braces are load-bearing. Azure Managed Redis is a CLUSTER.
 *
 * BullMQ runs Lua scripts that touch several of its keys at once — `bull:email:wait` and
 * `bull:email:active` in the same call. In a clustered Redis every key in one command must live in
 * the same hash slot, and the slot is computed from the key unless part of it is wrapped in
 * braces. Without a hash tag those two keys land on different nodes and every single operation
 * fails with:
 *
 *   CROSSSLOT Keys in request don't hash to the same slot
 *
 * Wrapping the prefix forces them together: `{email}:wait` and `{email}:active` hash identically.
 *
 * **What this cost.** Shipped without it on 2026-08-31, the worker failed on every poll — several
 * hundred times a second — and `worker.on('error')` logged each failure. 3.3 million log lines an
 * hour, ~2.2 GB, roughly 53 GB a day into Log Analytics. About ₹13,000 in twelve hours against a
 * ₹13,000 MONTHLY budget, which the cost guard then stopped the platform over. The queue had never
 * worked in a deployed environment for a moment.
 *
 * **Why no test caught it.** The unit tests use no Redis and the integration tests use the docker
 * one, which is a single node. Neither shares the deployed Redis's defining constraint. That is
 * `CLAUDE.md`'s rule about verifying with something that behaves like the thing being claimed
 * about, and this is now its most expensive instance.
 */
const QUEUE_PREFIX = '{email}';

export type EmailJob = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** `transactional` fails the caller if it cannot even be queued; `notification` never does. */
  kind: 'transactional' | 'notification';
};

/**
 * Retry policy. Three attempts over roughly a minute, which covers what actually goes wrong with
 * an SMTP relay: a restart, a brief network fault, a momentary refusal. It does not cover a relay
 * that is down for an hour, and is not meant to — that is an operational problem, and burning
 * attempts against it only delays finding out.
 */
const ATTEMPTS = 3;
const BACKOFF_MS = 5_000;

/** How often a repeating worker error may be logged. See `logWorkerError`. */
const WORKER_ERROR_LOG_INTERVAL_MS = 60_000;

const JOB_OPTIONS: JobsOptions = {
  attempts: ATTEMPTS,
  backoff: { type: 'exponential', delay: BACKOFF_MS },
  // Keep failures. A completed job is noise; a failed one is the only record that somebody did not
  // receive something, and #141 exists because those disappeared.
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

/**
 * Email delivery, off the request path (#141).
 *
 * Before this, every send was awaited inside the request that triggered it: a slow relay slowed
 * signup, and a failed send had no retry.
 *
 * ⚠️ **The worker runs in this process, not a separate one.** That is the right size for the
 * current volume and it has one consequence that must not be discovered later: on an environment
 * with `min_replicas = 0` — production today — a retry scheduled for thirty seconds hence does not
 * run until something wakes the container. The first attempt is unaffected, because the container
 * is necessarily alive at the moment the job is enqueued. So retries are reliable on UAT
 * (`min_replicas = 1`) and best-effort on prod until #92 is revisited.
 *
 * This is written down rather than solved because solving it means a dedicated worker container
 * with a Redis queue-depth scale rule, and at fifteen accounts that buys nothing. Revisit when
 * volume does.
 */
@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private queue?: Queue<EmailJob>;
  private worker?: Worker<EmailJob>;

  constructor(private readonly emailService: EmailService) {}

  /**
   * Redis is addressed by URL rather than by sharing `REDIS_CLIENT`. BullMQ needs connections it
   * controls — it issues blocking commands, and a client in a blocking read cannot serve anything
   * else, so handing it the shared client would stall account lockout and rate limiting.
   */
  private connectionOptions(): { connection: { url: string } } | null {
    const url = process.env.REDIS_URL;
    return url ? { connection: { url } } : null;
  }

  onModuleInit(): void {
    const opts = this.connectionOptions();
    if (!opts) {
      // Local development without Redis: EmailService already logs to the console there, so
      // enqueue() falls back to sending directly and nothing is silently dropped.
      this.logger.warn('REDIS_URL not set — email will be sent inline, without retries');
      return;
    }

    this.queue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, { ...opts, prefix: QUEUE_PREFIX });
    this.worker = new Worker<EmailJob>(
      EMAIL_QUEUE_NAME,
      async (job) => {
        const { to, subject, html, text } = job.data;
        await this.emailService.deliver(to, subject, html, text);
      },
      { ...opts, prefix: QUEUE_PREFIX, concurrency: 5 },
    );

    // The last line of defence. After the final attempt this is the only trace that a person did
    // not receive something — which is precisely what #141 says was missing.
    this.worker.on('failed', (job, err) => {
      const exhausted = (job?.attemptsMade ?? 0) >= ATTEMPTS;
      const entry = {
        msg: exhausted
          ? 'Email permanently failed after all retries'
          : 'Email attempt failed, will retry',
        to: job?.data.to,
        subject: job?.data.subject,
        kind: job?.data.kind,
        attempt: job?.attemptsMade,
        error: err.message,
      };
      if (exhausted) this.logger.error(entry);
      else this.logger.warn(entry);
    });

    // ⚠️ Rate limited, and that is the whole point of this block.
    //
    // A broken queue is a bug; a broken queue that logs every failure is an outage with an
    // invoice. When the worker could not talk to Redis it errored several hundred times a second,
    // and logging each one put 3.3 million lines an hour — about 53 GB a day — into Log Analytics,
    // which is billed by volume. The connection fault cost nothing. The logging cost ₹13,000 in
    // twelve hours and stopped the platform.
    //
    // So: the FIRST error is logged in full, because somebody needs to see it. Repeats are
    // counted and summarised at most once a minute, which is enough to know it is still happening
    // and cannot itself become the problem. This is a property of the logging, not of the error
    // — any repeating worker fault is now bounded.
    this.worker.on('error', (err) => this.logWorkerError(err));
  }

  private lastWorkerErrorLoggedAt = 0;
  private suppressedWorkerErrors = 0;

  /** At most one line a minute, however fast the worker fails. See the comment at the call site. */
  private logWorkerError(err: Error): void {
    const now = Date.now();
    const elapsed = now - this.lastWorkerErrorLoggedAt;
    if (elapsed < WORKER_ERROR_LOG_INTERVAL_MS) {
      this.suppressedWorkerErrors += 1;
      return;
    }
    this.logger.error({
      msg: 'Email worker error',
      error: err.message,
      // Named so the volume is visible in one line rather than in a million of them.
      suppressedSinceLast: this.suppressedWorkerErrors,
    });
    this.lastWorkerErrorLoggedAt = now;
    this.suppressedWorkerErrors = 0;
  }

  async onModuleDestroy(): Promise<void> {
    // Order matters: stop accepting work, then let in-flight jobs finish. Closing the queue after
    // the worker would let a job be enqueued with nothing left to run it.
    await this.worker?.close();
    await this.queue?.close();
  }

  /**
   * Hand an email off for delivery. Returns once it is durably queued — not once it is sent.
   *
   * Without a queue (local development), sends inline. A caller must not infer delivery from this
   * resolving; `register` in particular treats queueing and sending as different facts.
   */
  async enqueue(job: EmailJob): Promise<void> {
    if (!this.queue) {
      await this.emailService.deliver(job.to, job.subject, job.html, job.text);
      return;
    }
    await this.queue.add(job.kind, job, JOB_OPTIONS);
  }

  /**
   * An email the person is waiting on — verification, a reset link, an email-change confirmation.
   *
   * Resolves once the job is queued. It no longer resolves once the mail is *sent*, and callers
   * must not read it that way: `register` reports queueing and delivery as different facts for
   * exactly this reason.
   */
  async sendTransactional(to: string, subject: string, html: string, text: string): Promise<void> {
    await this.enqueue({ to, subject, html, text, kind: 'transactional' });
  }

  /**
   * An email that accompanies something rather than being the point of it — an invitation
   * notice, a notification. A failure here must never disturb the action that triggered it, which
   * is why nothing awaits the result and nothing throws.
   */
  sendNotification(to: string, subject: string, html: string, text: string): void {
    void this.enqueue({ to, subject, html, text, kind: 'notification' }).catch((err: Error) => {
      this.logger.warn({
        msg: 'Could not queue notification email',
        to,
        subject,
        error: err.message,
      });
    });
  }

  /** Test seam: the queue, when one exists. */
  getQueue(): Queue<EmailJob> | undefined {
    return this.queue;
  }
}
