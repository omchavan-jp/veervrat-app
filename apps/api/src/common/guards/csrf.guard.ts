import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AccessDeniedException } from '../exceptions/app.exceptions';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const cookie = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const header = request.headers[CSRF_HEADER] as string | undefined;

    if (!cookie || !header || cookie !== header) {
      throw new AccessDeniedException('CSRF_INVALID');
    }

    return true;
  }
}
