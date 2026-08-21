import { describe, it, expect, vi } from 'vitest';
import { CapabilitiesService } from './capabilities.service';

function make(env: Record<string, unknown> = {}) {
  const config = {
    get: vi.fn((key: string, fallback?: unknown) => (key in env ? env[key] : fallback)),
  };
  const repo = { listForUser: vi.fn().mockResolvedValue([]) };
  return { service: new CapabilitiesService(repo as never, config as never), repo };
}

describe('CapabilitiesService.featureMode', () => {
  describe('FEEDBACK_WIDGET', () => {
    it('reads the configured mode', () => {
      expect(make({ FEEDBACK_MODE: 'granted' }).service.featureMode('FEEDBACK_WIDGET')).toBe(
        'granted',
      );
    });

    it('rejects the removed `all` mode rather than honouring it', () => {
      // `all` meant "everyone, grants ignored" and was used on UAT. It made UAT differ from
      // prod on the mechanism UAT exists to test. Removed — and a stale config value must fail
      // closed, not silently open the feature to everyone.
      expect(make({ FEEDBACK_MODE: 'all' }).service.featureMode('FEEDBACK_WIDGET')).toBe('off');
    });

    it('fails closed on an unset or unrecognised value', () => {
      // A typo in config must not open a gated feature.
      expect(make({}).service.featureMode('FEEDBACK_WIDGET')).toBe('off');
      expect(make({ FEEDBACK_MODE: 'ALL' }).service.featureMode('FEEDBACK_WIDGET')).toBe('off');
      expect(make({ FEEDBACK_MODE: 'true' }).service.featureMode('FEEDBACK_WIDGET')).toBe('off');
    });
  });

  describe('CONTENT_EDIT', () => {
    it('is off on prod regardless of the environment toggle (O7)', () => {
      const { service } = make({ ENVIRONMENT: 'prod', CONTENT_EDIT_ENABLED: true });
      expect(service.featureMode('CONTENT_EDIT')).toBe('off');
    });

    it('is grant-gated on uat when enabled', () => {
      const { service } = make({ ENVIRONMENT: 'uat', CONTENT_EDIT_ENABLED: true });
      expect(service.featureMode('CONTENT_EDIT')).toBe('granted');
    });

    it('is off when the environment toggle is off', () => {
      const { service } = make({ ENVIRONMENT: 'uat', CONTENT_EDIT_ENABLED: false });
      expect(service.featureMode('CONTENT_EDIT')).toBe('off');
    });
  });
});

// Regression guard: CONTENT_EDIT_ENABLED was never wired into Terraform, so featureMode read an
// unset variable, defaulted to false, and the CONTENT_EDIT capability was INERT in every
// environment — the grant saved and could never take effect. The admin UI meanwhile showed the
// toggle as available, which is precisely the footgun the unavailable state exists to prevent.
describe('CONTENT_EDIT is inert without its environment gate', () => {
  it('is off when CONTENT_EDIT_ENABLED is unset, even on a non-prod environment', () => {
    const { service } = make({ ENVIRONMENT: 'uat' });
    expect(service.featureMode('CONTENT_EDIT')).toBe('off');
  });

  it('is grant-gated once the environment enables it', () => {
    const { service } = make({ ENVIRONMENT: 'uat', CONTENT_EDIT_ENABLED: true });
    expect(service.featureMode('CONTENT_EDIT')).toBe('granted');
  });
});
