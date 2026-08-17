import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        SESSION_SECRET: Joi.string().min(32).required(),
        FRONTEND_URL: Joi.string().required(),
        PORT: Joi.number().default(3001),
        LOG_LEVEL: Joi.string()
          .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
          .default('info'),
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        // Redis. Optional so the API still boots without it (local dev, unit tests), but when
        // unset the rate limiter falls back to per-process counters and Socket.IO to the
        // in-memory adapter — neither is safe with more than one replica.
        REDIS_URL: Joi.string().optional(),
        // Max pg connections held by ONE replica. The ceiling that matters is:
        //   DATABASE_POOL_MAX × maxReplicas + headroom (migrations, admin) ≤ server max_connections
        // Exhausting it is a cliff, not a slope: every request fails at once, health checks
        // included. Default 10 matches the pg driver's own default, so this cannot regress.
        DATABASE_POOL_MAX: Joi.number().integer().positive().default(10),
        // Upper bound on graceful shutdown. Container platforms SIGTERM, wait, then SIGKILL;
        // this must stay comfortably under that grace period.
        SHUTDOWN_TIMEOUT_MS: Joi.number().integer().positive().default(10000),
        // Object storage (MinIO / S3-compatible) — optional; uploads fail gracefully if unset
        S3_ENDPOINT: Joi.string().optional(),
        S3_REGION: Joi.string().default('us-east-1'),
        S3_BUCKET: Joi.string().optional(),
        S3_ACCESS_KEY: Joi.string().optional(),
        S3_SECRET_KEY: Joi.string().optional(),
        S3_PUBLIC_URL: Joi.string().optional(),
        MEILI_HOST: Joi.string().optional(),
        MEILI_MASTER_KEY: Joi.string().optional(),
        // Error tracking (GlitchTip / Sentry-compatible) — optional; disabled when unset.
        GLITCHTIP_DSN: Joi.string().optional(),
        // Overrides the SameSite default (`none` in production, `lax` otherwise). Set to `lax`
        // wherever web and api share a registrable domain — simpler and stricter than `none`.
        // Read directly from process.env by common/http/cookie.ts; declared here so an invalid
        // value fails at boot rather than silently falling back.
        COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').optional(),
        // In-context content editor (dev-only tooling; hard-off in production). All default
        // off/empty so production, CI, and local dev are unaffected unless explicitly enabled.
        CONTENT_EDIT_ENABLED: Joi.boolean().default(false),
        CONTENT_EDITOR_USER_IDS: Joi.string().default(''),
        CONTENT_EDIT_GITHUB_TOKEN: Joi.string().optional(),
        CONTENT_EDIT_GITHUB_REPO: Joi.string().optional(),
        CONTENT_EDIT_GITHUB_BASE_BRANCH: Joi.string().default('dev'),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),
  ],
})
export class AppConfigModule {}
