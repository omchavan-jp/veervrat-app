import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const AUDIT_METADATA_KEY = 'audit:options';

export type AuditContext = {
  req: Request;
  params: Record<string, string>;
  body: unknown;
  result: unknown;
};

export type AuditOptions = {
  action: string;
  resourceType?: string | null;
  // Route param name holding the resource id (e.g. 'id', 'cid'), or a function.
  resourceIdParam?: string;
  resourceId?: (ctx: AuditContext) => string | null | undefined;
  // Action-specific metadata captured from the request/response after success.
  metadata?: (ctx: AuditContext) => Record<string, unknown> | undefined;
};

// Marks a controller method as audited. The AuditInterceptor writes an audit event
// (fire-and-forget) after the handler succeeds. For privileged/admin/moderator actions.
export const Audited = (options: AuditOptions) => SetMetadata(AUDIT_METADATA_KEY, options);
