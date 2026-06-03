import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE = 'csrf-token';
const TOKEN_BYTES = 32;

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!req.cookies?.[CSRF_COOKIE]) {
      const token = randomBytes(TOKEN_BYTES).toString('hex');
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      });
    }
    next();
  }
}
