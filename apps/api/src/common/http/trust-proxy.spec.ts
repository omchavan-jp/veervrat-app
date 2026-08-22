import { describe, it, expect, vi } from 'vitest';
import { resolveTrustProxyHops, DEFAULT_TRUST_PROXY_HOPS } from './trust-proxy';

describe('resolveTrustProxyHops', () => {
  it('defaults to one hop when unset', () => {
    expect(resolveTrustProxyHops(undefined)).toBe(DEFAULT_TRUST_PROXY_HOPS);
    expect(resolveTrustProxyHops('')).toBe(DEFAULT_TRUST_PROXY_HOPS);
    expect(resolveTrustProxyHops('   ')).toBe(DEFAULT_TRUST_PROXY_HOPS);
  });

  it('refuses a boolean, which would hand clients control of their own rate-limit key', () => {
    // `trust proxy: true` makes req.ip the leftmost X-Forwarded-For entry — written by the
    // caller. That is worse than the bug this fixes: a limiter nobody can evade by accident is
    // at least honest about being off.
    const warn = vi.fn();
    expect(resolveTrustProxyHops('true', warn)).toBe(DEFAULT_TRUST_PROXY_HOPS);
    expect(resolveTrustProxyHops('TRUE', warn)).toBe(DEFAULT_TRUST_PROXY_HOPS);
    expect(warn).toHaveBeenCalled();
  });

  it('refuses values that are not a positive integer', () => {
    const warn = vi.fn();
    for (const bad of ['0', '-1', '1.5', 'two', 'loopback']) {
      expect(resolveTrustProxyHops(bad, warn)).toBe(DEFAULT_TRUST_PROXY_HOPS);
    }
    expect(warn).toHaveBeenCalledTimes(5);
  });

  it('accepts a real hop count', () => {
    expect(resolveTrustProxyHops('2')).toBe(2);
    expect(resolveTrustProxyHops(' 3 ')).toBe(3);
  });
});
