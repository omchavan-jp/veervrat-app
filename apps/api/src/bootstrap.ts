import { INestApplication, RequestMethod, ValidationError, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationException } from './common/exceptions/app.exceptions';

type ValidationDetail = { field: string; message: string };

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownDetails: ValidationDetail[] = error.constraints
      ? Object.values(error.constraints).map((message) => ({ field, message }))
      : [];
    const childDetails = error.children?.length
      ? flattenValidationErrors(error.children, field)
      : [];
    return [...ownDetails, ...childDetails];
  });
}

export function configureApp(app: INestApplication): void {
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const details = flattenValidationErrors(errors);
        const message = details[0]?.message ?? 'Validation failed';
        return new ValidationException(message, details);
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
}
