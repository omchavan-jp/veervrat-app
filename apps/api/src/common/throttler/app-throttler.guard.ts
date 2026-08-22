import { createHash } from 'node:crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RateLimitedException } from '../exceptions/app.exceptions';
import { IDENTITY_THROTTLER } from './throttler-config.factory';

/**
 * The email is hashed rather than stored in the key.
 *
 * Redis keys turn up in slow logs, `KEYS` output, memory dumps and monitoring tools — none of
 * which are places a user's address should be sitting in the clear. A hash is enough to count
 * against, which is all this needs to do. Truncated because a full digest buys nothing here:
 * this is a counter key, not a security boundary, and collisions between two real addresses
 * merely make the limit very slightly stricter for both.
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 16);
}

/**
 * Replaces the framework's `ThrottlerException` with an exception in this codebase's shape.
 *
 * The framework throws an `HttpException` whose body is a plain **string**, which the global
 * filter cannot read an error code out of — so every throttled request was reported to the
 * client as `INTERNAL_ERROR`. The filter now derives a code for string bodies too, but that is a
 * safety net; a refusal this ordinary deserves a real code and a real message, and only the
 * guard knows how long the caller has to wait.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  /**
   * Keys the `identity` throttler on the targeted email as well as the source IP.
   *
   * Every other throttler keeps the default per-IP behaviour. See IDENTITY_THROTTLER for why
   * per-IP alone was both too harsh (shared NAT) and too weak (it pre-empted account lockout).
   */
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    if (name !== IDENTITY_THROTTLER.name) return super.generateKey(context, suffix, name);

    const request = context.switchToHttp().getRequest<Request>();
    const body = request?.body as { email?: unknown } | undefined;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    // No email on the request — fall back to plain per-IP counting rather than lumping every
    // such request under one shared key, which would let unrelated callers exhaust each other.
    if (!email) return super.generateKey(context, suffix, name);

    return super.generateKey(context, `${suffix}:${hashEmail(email)}`, name);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<never> {
    // `timeToBlockExpire` is set when a route configures an explicit block duration; otherwise
    // the wait is until the window rolls over. Take whichever applies, and never report zero —
    // "try again in 0 seconds" invites an immediate retry that is refused again.
    const seconds = Math.max(1, Math.ceil(detail.timeToBlockExpire || detail.timeToExpire));

    // RFC 9110 §10.2.3. Clients that honour it back off correctly without parsing our body.
    const response = context.switchToHttp().getResponse<Response>();
    response?.setHeader?.('Retry-After', String(seconds));

    return Promise.reject(new RateLimitedException(seconds));
  }
}
