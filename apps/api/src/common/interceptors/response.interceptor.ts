import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<{ data: T }> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data): { data: T } => {
        // 204 / undefined bodies and already-wrapped payloads pass through untouched;
        // everything else is wrapped in the standard { data } envelope.
        if (response.statusCode === 204 || data === undefined) {
          return data as unknown as { data: T };
        }
        if (data && typeof data === 'object' && 'data' in data) {
          return data as unknown as { data: T };
        }
        return { data };
      }),
    );
  }
}
