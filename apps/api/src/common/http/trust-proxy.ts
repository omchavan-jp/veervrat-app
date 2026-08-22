/**
 * How many reverse-proxy hops sit between the internet and this process.
 *
 * Without this configured, Express reports the socket peer as `req.ip` — in Azure Container Apps
 * that is the ingress, not the caller. Every rate limit keys on `req.ip`, so the entire
 * throttling layer was inert in UAT and prod: seven requests against a five-per-hour limit were
 * all accepted (#161). The account lockout kept working only because it keys on the email in
 * Redis at the service layer rather than on the IP at the guard.
 *
 * ⚠️ **Never set this to `true`.** Express treats a boolean as "trust the whole chain", which
 * makes `req.ip` the leftmost `X-Forwarded-For` entry — a value the client writes. That turns a
 * broken rate limiter into a bypassable one, which is strictly worse: a limiter nobody can evade
 * by accident is at least honest about being off. This module only accepts a hop count, and
 * rejects a boolean outright.
 *
 * **Why a count is safe.** `proxy-addr` builds the chain as
 * `[socket peer, ...X-Forwarded-For reversed]` and returns the first address it does not trust.
 * A count of 1 therefore trusts the socket peer (the ingress) and yields the **rightmost**
 * `X-Forwarded-For` entry — the address the ingress itself observed. Anything a client puts in
 * that header lands to the *left* of the ingress's own entry and is never selected.
 *
 * **Why it is configurable.** The correct count is a property of the deployed topology, not of
 * this code, and getting it wrong fails quietly in both directions — too low pins everyone to
 * one shared bucket, too high hands the client control of its own key. Making it an environment
 * variable means the count can be corrected against a measurement without a code deploy. See
 * DEPLOYMENT.md → "Verifying rate limiting actually works".
 */
export const DEFAULT_TRUST_PROXY_HOPS = 1;

export function resolveTrustProxyHops(
  raw: string | undefined,
  warn: (message: string) => void = () => {},
): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_TRUST_PROXY_HOPS;

  const value = raw.trim();

  // Someone reaching for the familiar Express idiom. Refuse it loudly rather than honouring it.
  if (/^(true|false)$/i.test(value)) {
    warn(
      `TRUST_PROXY_HOPS=${value} is not accepted — a boolean would let clients spoof their own ` +
        `IP via X-Forwarded-For. Falling back to ${DEFAULT_TRUST_PROXY_HOPS}.`,
    );
    return DEFAULT_TRUST_PROXY_HOPS;
  }

  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 1) {
    warn(
      `TRUST_PROXY_HOPS=${value} is not a positive integer. Falling back to ` +
        `${DEFAULT_TRUST_PROXY_HOPS}.`,
    );
    return DEFAULT_TRUST_PROXY_HOPS;
  }

  return hops;
}
