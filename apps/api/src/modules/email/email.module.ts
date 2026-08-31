import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';

/**
 * `EmailService` is the transport — put this on the wire, or throw. `EmailQueueService` owns the
 * policy: what is retried, how often, and what happens when it stops being retried.
 *
 * Callers want the second one. The first is exported because the worker and the tests need it,
 * not because a feature should reach for it — a direct `deliver()` from a request path is the
 * behaviour #141 exists to remove.
 */
@Global()
@Module({
  providers: [EmailService, EmailQueueService],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
