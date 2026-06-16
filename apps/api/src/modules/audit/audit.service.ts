import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository, type AuditWrite } from './audit.repository';

// Fire-and-forget audit writes. An audit failure MUST NOT block or fail the user's
// request (spec/17 doc §Implementation) — every write is async and swallows errors.
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private readonly repository: AuditRepository) {}

  // Non-blocking: callers do not await. Errors are logged, never thrown.
  record(event: Partial<AuditWrite> & { action: string }): void {
    const write: AuditWrite = {
      actorId: event.actorId ?? null,
      action: event.action,
      resourceType: event.resourceType ?? null,
      resourceId: event.resourceId ?? null,
      metadata: event.metadata ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
    };
    void this.repository.create(write).catch((error) => {
      this.logger.warn({
        msg: 'audit write failed',
        action: write.action,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  async list(params: { cursor?: string; action?: string; actorId?: string }) {
    return this.repository.list(params);
  }
}
