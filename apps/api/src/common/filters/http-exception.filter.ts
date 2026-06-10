import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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

    // Server errors are always logged with their stack; client (4xx) errors are not.
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        {
          msg: 'Unhandled server error',
          statusCode,
          method: request?.method,
          path: request?.url,
          error: exception instanceof Error ? exception.message : String(exception),
        },
        stack,
      );
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      ...(details !== undefined && { details }),
    });
  }
}
