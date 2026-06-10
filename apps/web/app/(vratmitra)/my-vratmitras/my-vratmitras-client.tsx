'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api/client';
import { MessageSquare } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VM {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  scope: 'GLOBAL' | 'JOURNEY';
  assignedJourneys: string[];
}

export function MyVratmitrasClient() {
  const t = useTranslations();
  const router = useRouter();
  const [selectedVmId, setSelectedVmId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-vms'],
    queryFn: async () => {
      const response = await api.get<{ data: VM[] }>('/vm-relationships/my-vms');
      return response?.data || [];
    },
    staleTime: 30000,
  });

  const vms = data || [];
  const selectedVm = vms.find((vm) => vm.id === selectedVmId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel: VM List */}
      <div className="w-80 shrink-0 border-r border-border bg-surface rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-display text-lg font-medium">
            {t('my_vratmitras.title')}
          </h2>
          <p className="text-sm text-muted mt-1">
            {vms.length} {vms.length === 1 ? 'vratmitra' : 'vratmitras'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-muted">
              {t('common.loading')}...
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-destructive">
              {t('common.error_loading')}
            </div>
          )}

          {vms.length === 0 && !isLoading && (
            <div className="p-4 text-center text-muted">
              {t('my_vratmitras.no_vms')}
            </div>
          )}

          {vms.map((vm) => (
            <button
              key={vm.id}
              onClick={() => setSelectedVmId(vm.id)}
              className={`w-full p-4 border-b border-border text-left transition-colors ${
                selectedVmId === vm.id
                  ? 'bg-accent/10'
                  : 'hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {vm.avatarUrl && <AvatarImage src={vm.avatarUrl} />}
                  <AvatarFallback className="text-xs">
                    {getInitials(vm.displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{vm.displayName}</p>
                  <p className="text-sm text-muted truncate">@{vm.username}</p>
                </div>

                <Badge variant={vm.scope === 'GLOBAL' ? 'default' : 'secondary'}>
                  {vm.scope === 'GLOBAL' ? 'Global' : 'Journey'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: VM Detail & Chat CTA */}
      <div className="flex-1 rounded-lg overflow-hidden flex flex-col">
        {selectedVm ? (
          <>
            {/* Detail Header */}
            <div className="bg-surface border border-border rounded-lg p-6 mb-4">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  {selectedVm.avatarUrl && <AvatarImage src={selectedVm.avatarUrl} />}
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedVm.displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h3 className="font-display text-xl font-medium">
                    {selectedVm.displayName}
                  </h3>
                  <p className="text-muted">@{selectedVm.username}</p>
                  <Badge className="mt-2" variant={selectedVm.scope === 'GLOBAL' ? 'default' : 'secondary'}>
                    {selectedVm.scope === 'GLOBAL'
                      ? t('my_vratmitras.global_vm')
                      : t('my_vratmitras.journey_vm')}
                  </Badge>
                </div>
              </div>

              {/* Journey List */}
              {selectedVm.assignedJourneys.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted mb-2">
                    {t('my_vratmitras.assigned_journeys')}
                  </p>
                  <div className="text-sm text-fg">
                    {selectedVm.assignedJourneys.length} journey
                    {selectedVm.assignedJourneys.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}

              {/* Action CTA */}
              <Button
                onClick={() => router.push(`/my-vratmitras/${selectedVm.id}/chat`)}
                className="mt-4 w-full gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                {t('my_vratmitras.open_chat')}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">
                {t('my_vratmitras.select_vm')}
              </p>
              <p className="text-sm">{t('my_vratmitras.select_from_list')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
