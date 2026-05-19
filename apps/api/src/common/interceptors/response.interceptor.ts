import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        if (response.statusCode === 204 || data === undefined) {
          return data;
        }
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        }
        return { data };
      }),
    );
  }
}
