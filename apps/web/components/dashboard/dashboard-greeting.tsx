'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';

export function DashboardGreeting() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();

  return (
    <h1 className="font-display text-[clamp(26px,3vw,38px)] leading-tight tracking-tight">
      {user?.displayName ? t('greetingWithName', { name: user.displayName }) : t('greeting')}.
    </h1>
  );
}
