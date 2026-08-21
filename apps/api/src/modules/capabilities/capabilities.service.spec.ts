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
      expect(make({ FEEDBACK_MODE: 'all' }).service.featureMode('FEEDBACK_WIDGET')).toBe('all');
      expect(make({ FEEDBACK_MODE: 'granted' }).service.featureMode('FEEDBACK_WIDGET')).toBe(
        'granted',
      );
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

    it('is never `all` — content editing is always per-user, never environment-wide', () => {
      for (const env of ['local', 'uat', 'prod']) {
        const { service } = make({ ENVIRONMENT: env, CONTENT_EDIT_ENABLED: true });
        expect(service.featureMode('CONTENT_EDIT')).not.toBe('all');
      }
    });
  });
});
