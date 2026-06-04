'use client';

import { useQuery } from '@tanstack/react-query';
import { weaknessesApi } from '@/lib/api/weaknesses';
import { queryKeys } from '@/lib/api/query-keys';

export function useWeaknesses() {
  return useQuery({
    queryKey: queryKeys.weaknesses.all,
    queryFn: weaknessesApi.list,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeakness(id: string) {
  return useQuery({
    queryKey: queryKeys.weaknesses.detail(id),
    queryFn: () => weaknessesApi.detail(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
