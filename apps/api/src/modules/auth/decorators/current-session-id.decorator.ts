import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The id of the session making this request, put on the request by `SessionGuard`.
 *
 * Needed because the re-authentication proof is bound to a session rather than a user (#196):
 * proving who you are on one device must not authorise a deletion from another.
 */
export const CurrentSessionId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { sessionId?: string }>();
  return request.sessionId;
});
