import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type JobsOptions } from 'bullmq';
import { EmailService } from './email.service';

export const EMAIL_QUEUE_NAME = 'email';

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

    this.queue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, opts);
    this.worker = new Worker<EmailJob>(
      EMAIL_QUEUE_NAME,
      async (job) => {
        const { to, subject, html, text } = job.data;
        await this.emailService.deliver(to, subject, html, text);
      },
      { ...opts, concurrency: 5 },
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

    this.worker.on('error', (err) => {
      this.logger.error({ msg: 'Email worker error', error: err.message });
    });
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
