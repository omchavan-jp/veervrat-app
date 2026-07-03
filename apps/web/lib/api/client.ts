const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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
    const res = await fetch(`${API_BASE_URL}/auth/csrf`, {
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
    return fetch(`${API_BASE_URL}${path}`, {
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
