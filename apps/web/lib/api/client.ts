import { getRuntimeConfig } from '@/lib/runtime-config';

// Resolved per call, never at module scope: the api base URL varies per environment, and one
// build serves both. See lib/runtime-config.ts.
const apiBaseUrl = () => getRuntimeConfig().apiBaseUrl;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Called when the api says the session is gone.
 *
 * Without this a dead session shows a BROKEN app rather than a logged-out one: every request
 * 401s, each surfaces its own "please try again" error, and the signed-in chrome stays on
 * screen because nothing tells the auth state it is no longer true. Observed after signing out
 * in a second window — navigating still "worked", personal data panels just failed, and only a
 * manual refresh redirected.
 *
 * Registered by Providers rather than imported, because this module has no React context.
 */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/**
 * A 401 means "you are not signed in" and should end the session everywhere.
 *
 * Two deliberate exclusions:
 *  - `/auth/me`, where a 401 is the ANSWER ("nobody is signed in"), not a failure — treating it
 *    as a sign-out would fire on every anonymous page load.
 *  - 403, which is a permission decision, not a dead session. Signing someone out for opening a
 *    page they simply may not see would be worse than the bug this fixes.
 */
function notifyIfSessionEnded(status: number, path: string): void {
  if (status !== 401) return;
  if (path.startsWith('/auth/me')) return;
  onUnauthorized?.();
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// The api and web run on different origins in production, so the web app cannot
// read the api-domain csrf-token cookie. Instead we fetch the token from
// GET /auth/csrf (which returns it in the body) and keep it in memory; the
// browser still sends the matching cookie automatically for the double-submit
// check on the api side.
let csrfTokenCache: string | undefined;

async function fetchCsrfToken(): Promise<string | undefined> {
  try {
    const res = await fetch(`${apiBaseUrl()}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const body = (await res.json()) as { data?: { csrfToken?: string } };
      csrfTokenCache = body?.data?.csrfToken;
    }
  } catch {
    // Network error — leave the cache untouched; the mutation will surface it.
  }
  return csrfTokenCache;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const isMutation = !SAFE_METHODS.has(method);

  const send = async (): Promise<Response> => {
    const csrfHeader: Record<string, string> = {};
    if (isMutation) {
      const token = csrfTokenCache ?? (await fetchCsrfToken());
      if (token) {
        csrfHeader['x-csrf-token'] = token;
      }
    }
    return fetch(`${apiBaseUrl()}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeader,
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };

  let res = await send();
  // A stale/absent CSRF token surfaces as 403; the guard runs before the handler
  // so the mutation never executed — safe to refresh the token and retry once.
  if (res.status === 403 && isMutation) {
    csrfTokenCache = undefined;
    await fetchCsrfToken();
    res = await send();
  }

  if (!res.ok) {
    notifyIfSessionEnded(res.status, path);
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      errorBody.error || 'UNKNOWN_ERROR',
      errorBody.message || res.statusText,
      errorBody.details,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};

export { ApiError };
