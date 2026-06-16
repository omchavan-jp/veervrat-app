import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AuditService } from './audit.service';
import { AUDIT_METADATA_KEY, type AuditOptions, type AuditContext } from './audited.decorator';
import type { SessionUser } from '../auth/types/auth.types';

// Reads @Audited() metadata and records an audit event AFTER the handler succeeds
// (errors short-circuit — failed actions aren't audited as successful). Captures
// actor, ip, user-agent automatically; resource id + metadata via the decorator opts.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditOptions | undefined>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap((result) => {
        const ctx: AuditContext = {
          req,
          params: (req.params ?? {}) as Record<string, string>,
          body: req.body,
          result,
        };
        const user = req.user as SessionUser | undefined;

        let resourceId: string | null = null;
        if (options.resourceId) resourceId = options.resourceId(ctx) ?? null;
        else if (options.resourceIdParam) resourceId = ctx.params[options.resourceIdParam] ?? null;

        this.auditService.record({
          actorId: user?.id ?? null,
          action: options.action,
          resourceType: options.resourceType ?? null,
          resourceId,
          metadata: options.metadata ? options.metadata(ctx) ?? null : null,
          ipAddress: clientIp(req),
          userAgent: req.headers['user-agent'] ?? null,
        });
      }),
    );
  }
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.ip ?? req.socket?.remoteAddress ?? null;
}
