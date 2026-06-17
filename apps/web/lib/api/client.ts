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

function getCsrfToken(): string | undefined {
  return document.cookie
    .split('; ')
    .reduce<Record<string, string>>((acc, cookie) => {
      const [name, value] = cookie.split('=');
      acc[name] = decodeURIComponent(value ?? '');
      return acc;
    }, {})['csrf-token'];
}

async function bootstrapCsrf(): Promise<void> {
  // Fetches GET /auth/csrf so CsrfMiddleware sets the cookie before the first mutation.
  await fetch(`${API_BASE_URL}/auth/csrf`, { method: 'GET', credentials: 'include' });
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const csrfHeader: Record<string, string> = {};
  if (!SAFE_METHODS.has(method)) {
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      await bootstrapCsrf();
      csrfToken = getCsrfToken();
    }
    if (csrfToken) {
      csrfHeader['x-csrf-token'] = csrfToken;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeader,
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

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
