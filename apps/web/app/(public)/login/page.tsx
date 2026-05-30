'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleIcon } from '@/components/auth/google-icon';
import { useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAUTH_ACCOUNT_CONFLICT:
    'An account with this email already exists. Please sign in with your email and password.',
  AUTH_ERROR: 'Authentication failed. Please try again.',
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    login.mutate(data);
  };

  const apiError =
    login.error instanceof ApiError ? login.error.message : login.error?.message;

  return (
    <AuthShell
      hero={{
        eyebrow: 'Return',
        heading: 'Welcome back. Pick up where you left.',
        devanagari: 'दिवसातून एक पाऊल — पुरेसे आहे.',
        gloss: 'One step a day is enough. The discipline is the destination.',
      }}
    >
      <h2 className="mb-2 font-display text-[32px] tracking-tight">Log in</h2>
      <p className="mb-8 text-[15px] text-muted">Continue your practice.</p>

      {oauthError && (
        <div className="mb-4 rounded-xl border border-[rgba(192,81,47,0.2)] bg-[rgba(192,81,47,0.08)] px-4 py-3 text-sm text-accent">
          {OAUTH_ERROR_MESSAGES[oauthError] ?? 'An unexpected error occurred.'}
        </div>
      )}

      {apiError && (
        <div className="mb-4 rounded-xl border border-[rgba(192,81,47,0.2)] bg-[rgba(192,81,47,0.08)] px-4 py-3 text-sm text-accent">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Email
          </label>
          <Input
            type="email"
            placeholder="you@example.com"
            className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-accent">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Password
          </label>
          <Input
            type="password"
            placeholder="••••••••"
            className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-accent">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="-mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-[13px] text-accent-2 underline decoration-[rgba(47,91,79,0.3)]"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={login.isPending}
          className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
        >
          {login.isPending ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="h-auto w-full rounded-xl border-border-strong bg-surface px-6 py-3.5 text-[15px] text-fg hover:bg-bg"
        nativeButton={false}
        render={<a href={`${API_URL}/auth/google`} />}
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link
          href="/register"
          className="text-accent underline decoration-accent/40 hover:no-underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
