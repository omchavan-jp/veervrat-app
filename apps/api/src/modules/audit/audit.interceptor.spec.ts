import { describe, it, expect, vi } from 'vitest';
import { of, lastValueFrom } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AUDIT_METADATA_KEY, type AuditOptions } from './audited.decorator';

function makeCtx(req: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
  } as never;
}

function makeInterceptor(options: AuditOptions | undefined) {
  const reflector = { get: vi.fn().mockReturnValue(options) } as never;
  const audit = { record: vi.fn() };
  return { interceptor: new AuditInterceptor(reflector, audit as never), audit };
}

describe('AuditInterceptor', () => {
  it('passes through when no @Audited metadata', async () => {
    const { interceptor, audit } = makeInterceptor(undefined);
    const ctx = makeCtx({ method: 'POST', params: {}, body: {} });
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({ data: { id: 'x' } }) }));
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('unwraps the ResponseInterceptor `{ data }` envelope before resourceId/metadata', async () => {
    const { interceptor, audit } = makeInterceptor({
      action: 'admin.override_journey_state',
      resourceType: 'journey',
      resourceId: (c) => (c.result as { id?: string })?.id,
      metadata: (c) => ({ to: (c.result as { to?: string })?.to }),
    });
    const ctx = makeCtx({ method: 'PATCH', params: {}, body: {}, ip: '1.2.3.4', headers: {} });
    // Handler returned { id, from, to }; ResponseInterceptor wrapped it as { data: {...} }.
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({ data: { id: 'j1', from: 'ACTIVE', to: 'PAUSED' } }) }));
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'j1', metadata: { to: 'PAUSED' } }),
    );
  });

  it('handles an unwrapped result too (no envelope)', async () => {
    const { interceptor, audit } = makeInterceptor({
      action: 'admin.create_shloka',
      resourceId: (c) => (c.result as { id?: string })?.id,
    });
    const ctx = makeCtx({ method: 'POST', params: {}, body: {}, ip: '1.2.3.4', headers: {} });
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({ id: 'sh1' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'sh1' }));
  });
});
