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
    const token = request.cookies?.[this.cookieName];
    if (token) {
      const user = await this.authService.validateSession(token).catch(() => null);
      if (user) request.user = user;
    }
    return true;
  }
}
