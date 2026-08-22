import {
  INestApplication,
  Logger,
  RequestMethod,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationException } from './common/exceptions/app.exceptions';
import { resolveTrustProxyHops } from './common/http/trust-proxy';

type ValidationDetail = { field: string; message: string };

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): ValidationDetail[] {
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
  // Makes Nest run onModuleDestroy / onApplicationShutdown on process signals. Without this
  // those hooks never fire — PrismaService.onModuleDestroy was dead code — so connections were
  // dropped mid-query rather than closed on every restart.
  app.enableShutdownHooks();
  // Every rate limit keys on `req.ip`. Behind Container Apps' ingress that is the proxy unless
  // Express is told how many hops to look through — which is why throttling was inert in both
  // deployed environments (#161). See common/http/trust-proxy.ts for why this is a hop count
  // and never `true`.
  // `getInstance()` is typed `any`. Narrow it to the single method used rather than casting the
  // whole Express app, so a rename fails to compile instead of failing silently at runtime.
  const httpServer = app.getHttpAdapter().getInstance() as {
    set(setting: string, value: unknown): void;
  };
  httpServer.set(
    'trust proxy',
    resolveTrustProxyHops(process.env.TRUST_PROXY_HOPS, (message) =>
      new Logger('TrustProxy').warn(message),
    ),
  );
  // HTTP security headers. The API serves JSON only, so disable the default CSP
  // (that's the frontend's concern) and COEP (would block cross-origin image/CDN use).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
    ],
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
