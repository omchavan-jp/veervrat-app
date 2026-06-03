'use client';

import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="py-12">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
        Dashboard
      </div>
      <h1 className="mb-6 font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
        Welcome back{user.name ? `, ${user.name}` : ''}.
      </h1>

      <div className="rounded-xl border border-border bg-surface p-6">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              Email
            </dt>
            <dd className="mt-1">{user.email}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              Role
            </dt>
            <dd className="mt-1 capitalize">{user.role.toLowerCase()}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              Status
            </dt>
            <dd className="mt-1 text-accent-2">Authenticated</dd>
          </div>
        </dl>
      </div>

      <p className="mt-8 text-sm text-muted">
        This is a placeholder. The full dashboard will be built during domain
        modeling.
      </p>
    </div>
  );
}
