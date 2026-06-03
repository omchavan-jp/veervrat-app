'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleIcon } from '@/components/auth/google-icon';
import { useRegister } from '@/hooks/use-auth';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function RegisterPage() {
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(data);
  };

  const apiError =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : registerMutation.error?.message;

  if (registerMutation.isSuccess) {
    return (
      <AuthShell
        hero={{
          eyebrow: 'Begin',
          heading: 'A practice of becoming, one weakness at a time.',
          devanagari: 'वीरव्रत — स्वतःशी प्रामाणिक राहण्याचा संकल्प.',
          gloss: 'Veervrat — the vow to be honest with oneself. Identify what holds you back. Work on it daily. Track the shift.',
        }}
      >
        <h2 className="mb-2 font-display text-[32px] tracking-tight">
          Check your email
        </h2>
        <p className="mb-8 text-[15px] text-muted">
          We sent a verification link to your email. Click the link to activate
          your account.
        </p>
        <Link
          href="/login"
          className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          Back to login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      hero={{
        eyebrow: 'Begin',
        heading: 'A practice of becoming, one weakness at a time.',
        devanagari: 'वीरव्रत — स्वतःशी प्रामाणिक राहण्याचा संकल्प.',
        gloss: 'Veervrat — the vow to be honest with oneself. Identify what holds you back. Work on it daily. Track the shift.',
      }}
    >
      <h2 className="mb-2 font-display text-[32px] tracking-tight">
        Create your account
      </h2>
      <p className="mb-8 text-[15px] text-muted">
        Takes about a minute. You&rsquo;ll set up your profile after.
      </p>

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
          <p className="mt-1.5 text-xs text-muted">
            At least 8 characters. Use a phrase you&rsquo;ll remember.
          </p>
          {errors.password && (
            <p className="mt-1 text-xs text-accent">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={registerMutation.isPending}
          className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
        >
          {registerMutation.isPending ? 'Creating account...' : 'Create account'}
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
        Already a member?{' '}
        <Link
          href="/login"
          className="text-accent underline decoration-accent/40 hover:no-underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
