'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journeysApi } from '@/lib/api/journeys';
import { queryKeys } from '@/lib/api/query-keys';

export function useJourneys() {
  return useQuery({
    queryKey: queryKeys.journeys.all,
    queryFn: () => journeysApi.list(),
  });
}

export function useJourney(id: string) {
  return useQuery({
    queryKey: queryKeys.journeys.detail(id),
    queryFn: () => journeysApi.detail(id),
    enabled: !!id,
  });
}

export function useCreateJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: journeysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journeys.all });
    },
  });
}

export function useUpdateJourneyState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' }) =>
      journeysApi.updateState(id, action),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journeys.detail(id) });
    },
  });
}

export function useUpdateJourneyTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      journeysApi.updateTitle(id, title),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journeys.detail(id) });
    },
  });
}
