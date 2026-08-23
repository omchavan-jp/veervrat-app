'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { queryKeys } from '@/lib/api/query-keys';

/**
 * Which policy documents still need accepting.
 *
 * `staleTime: Infinity` because a document version cannot change during a session in any way
 * this browser would need to react to mid-visit — publishing a new version is a deliberate,
 * infrequent operation, and the next navigation picks it up. The alternative, polling, would put
 * a request on a timer for something that changes a few times a year.
 */
export function useOutstandingConsents(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.auth.outstandingConsents,
    queryFn: authApi.outstandingConsents,
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}

export function useAcceptConsents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.acceptConsents,
    onSuccess: () => {
      // Refetch rather than assume: if the server recorded something different from what was
      // shown — a version published between render and click — the gate should reflect the
      // server, not this browser's memory of it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.outstandingConsents });
    },
  });
}
