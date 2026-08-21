import { api } from './client';

type Wrapped<T> = { data: T };

export type AuditEvent = {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditList = { items: AuditEvent[]; nextCursor: string | null };

export const auditApi = {
  list: (filters?: { action?: string; actorId?: string; cursor?: string }) => {
    const p = new URLSearchParams();
    if (filters?.action) p.set('action', filters.action);
    if (filters?.actorId) p.set('actorId', filters.actorId);
    if (filters?.cursor) p.set('cursor', filters.cursor);
    const qs = p.toString();
    return api
      .get<Wrapped<AuditList>>(`/admin/audit-events${qs ? `?${qs}` : ''}`)
      .then((r) => r.data);
  },
};
