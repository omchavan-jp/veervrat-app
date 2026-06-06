'use client';

import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/api/query-keys';
import { notificationsApi } from '@/lib/api/notifications';
import { NotificationPanel } from './notification-panel';

export function NotificationBell() {
  const { data } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30_000,
  });

  const count = data?.count ?? 0;

  return (
    <Popover>
      <PopoverTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative h-8 w-8')}>
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
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
