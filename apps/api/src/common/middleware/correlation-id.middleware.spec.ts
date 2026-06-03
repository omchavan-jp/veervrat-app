import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

const mockAssign = vi.fn();
const mockLogger = { assign: mockAssign } as any;

function makeReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers };
}

function makeRes(): { setHeader: ReturnType<typeof vi.fn>; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    setHeader: vi.fn((key: string, value: string) => {
      headers[key.toLowerCase()] = value;
    }),
    headers,
  };
}

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new CorrelationIdMiddleware(mockLogger);
  });

  it('generates a UUID when X-Correlation-Id header is absent', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    middleware.use(req as Request, res as unknown as Response, next);

    const id = res.headers['x-correlation-id'];
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(mockAssign).toHaveBeenCalledWith({ correlationId: id });
    expect(next).toHaveBeenCalledOnce();
  });

  it('reuses X-Correlation-Id from upstream when header is present', () => {
    const req = makeReq({ 'x-correlation-id': 'upstream-id-abc' });
    const res = makeRes();
    const next = vi.fn();

    middleware.use(req as Request, res as unknown as Response, next);

    expect(res.headers['x-correlation-id']).toBe('upstream-id-abc');
    expect(mockAssign).toHaveBeenCalledWith({ correlationId: 'upstream-id-abc' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('always sets X-Correlation-Id on the response', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    middleware.use(req as Request, res as unknown as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-Id', expect.any(String));
  });
});
