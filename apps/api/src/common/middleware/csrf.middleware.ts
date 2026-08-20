import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { authCookieOptions } from '../http/cookie';

const CSRF_COOKIE = 'csrf-token';
const TOKEN_BYTES = 32;

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    let token = req.cookies?.[CSRF_COOKIE] as string | undefined;
    if (!token) {
      token = randomBytes(TOKEN_BYTES).toString('hex');
      res.cookie(CSRF_COOKIE, token, authCookieOptions({ httpOnly: false }));
    }
    // Expose the current token so GET /auth/csrf can return it in the body —
    // on split-domain deploys the web app can't read the api-domain cookie.
    res.locals.csrfToken = token;
    next();
  }
}
