import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Response } from 'express';
import { RateLimitedException } from '../exceptions/app.exceptions';

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
