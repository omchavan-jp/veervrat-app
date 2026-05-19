import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        error = (bodyObj.error as string) || `HTTP_${statusCode}`;
        message = (bodyObj.message as string) || exception.message;
        details = bodyObj.details;
      } else {
        message = String(body);
      }
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      ...(details !== undefined && { details }),
    });
  }
}
