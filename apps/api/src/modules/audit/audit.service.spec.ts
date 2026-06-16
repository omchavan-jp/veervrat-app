import { describe, it, expect, vi } from 'vitest';
import { AuditService } from './audit.service';

function make(createImpl?: () => Promise<unknown>) {
  const repo = { create: vi.fn(createImpl ?? (() => Promise.resolve({}))), list: vi.fn() };
  return { service: new AuditService(repo as never), repo };
}

describe('AuditService', () => {
  it('records an event with defaults for omitted fields', async () => {
    const { service, repo } = make();
    service.record({ action: 'auth.login_success', actorId: 'u1' });
    await new Promise((r) => setTimeout(r, 0)); // let the fire-and-forget settle
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_success', actorId: 'u1', resourceType: null, metadata: null }),
    );
  });

  it('is fire-and-forget: record returns void synchronously', () => {
    const { service } = make();
    expect(service.record({ action: 'auth.logout' })).toBeUndefined();
  });

  it('swallows a write failure (never throws)', async () => {
    const { service, repo } = make(() => Promise.reject(new Error('db down')));
    expect(() => service.record({ action: 'auth.logout' })).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(repo.create).toHaveBeenCalled();
  });
});
