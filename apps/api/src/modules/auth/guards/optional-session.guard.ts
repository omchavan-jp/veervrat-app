import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

/**
 * Silently populates req.user if a valid session cookie is present.
 * Does NOT throw — returns true regardless (for guest-accessible routes).
 */
@Injectable()
export class OptionalSessionGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>('SESSION_COOKIE_NAME', 'veervrat_session');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = (request.cookies as Record<string, string> | undefined)?.[this.cookieName];
    if (token) {
      const session = await this.authService.validateSession(token).catch(() => null);
      if (session) {
        // `validateSession` returns { user, sessionId }, not a bare user. Assigning the wrapper
        // here made `@CurrentUser()` hand every guest-accessible route an object whose `id` is
        // undefined — so an author could not read their own experience log, and a private image
        // 404'd for the person who uploaded it (#196 regression, found 2026-08-26).
        //
        // TypeScript did not catch it: Passport augments `Request['user']` with an empty
        // interface, so any object satisfies it. Hence the guard spec below asserts the shape.
        request.user = session.user;
        (request as Request & { sessionId?: string }).sessionId = session.sessionId;
      }
    }
    return true;
  }
}
