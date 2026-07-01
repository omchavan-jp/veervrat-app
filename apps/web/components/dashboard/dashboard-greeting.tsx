'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { PageTitle } from '@/components/ui/typography';

export function DashboardGreeting() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();

  return (
    <PageTitle>
      {user?.displayName ? t('greetingWithName', { name: user.displayName }) : t('greeting')}.
    </PageTitle>
  );
}
