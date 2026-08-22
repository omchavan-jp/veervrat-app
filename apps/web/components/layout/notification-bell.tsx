'use client';

import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/api/query-keys';
import { notificationsApi } from '@/lib/api/notifications';
import { NotificationPanel } from './notification-panel';

export function NotificationBell() {
  const t = useTranslations('notifications');
  const { data } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30_000,
  });

  const count = data?.count ?? 0;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={count > 0 ? t('openWithCount', { count }) : t('open')}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'relative h-11 w-11 md:h-8 md:w-8',
        )}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-bg"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationPanel />
      </PopoverContent>
    </Popover>
  );
}
