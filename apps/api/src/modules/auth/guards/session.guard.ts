import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { SessionExpiredException } from '../../../common/exceptions/app.exceptions';

@Injectable()
export class SessionGuard implements CanActivate {
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

    if (!token) {
      throw new SessionExpiredException();
    }

    const session = await this.authService.validateSession(token);
    if (!session) {
      throw new SessionExpiredException();
    }

    request.user = session.user;
    // Carried so a sensitive action can check whether THIS session re-authenticated recently.
    (request as Request & { sessionId?: string }).sessionId = session.sessionId;
    return true;
  }
}
