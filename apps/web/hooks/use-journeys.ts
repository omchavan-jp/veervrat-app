'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journeysApi, ercApi, checkinsApi } from '@/lib/api/journeys';
import type { ErcType, CheckinStatus } from '@/lib/api/journeys';
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

// ─── ERC hooks ─────────────────────────────────────────────────────────────

export function useErcPool(journeyId: string, type: ErcType) {
  return useQuery({
    queryKey: queryKeys.erc.pool(journeyId, type),
    queryFn: () => ercApi.getPool(journeyId, type),
    enabled: !!journeyId,
  });
}

export function useErcItems(journeyId: string, type: ErcType) {
  return useQuery({
    queryKey: queryKeys.erc.list(journeyId, type),
    queryFn: () => ercApi.list(journeyId, type),
    enabled: !!journeyId,
  });
}

function useErcMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  journeyId: string,
  type: ErcType,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.erc.list(journeyId, type) });
      queryClient.invalidateQueries({ queryKey: queryKeys.erc.pool(journeyId, type) });
      queryClient.invalidateQueries({ queryKey: queryKeys.journeys.detail(journeyId) });
    },
  });
}

export function useSelectErc(journeyId: string, type: ErcType) {
  return useErcMutation(
    ({ poolItemId }: { poolItemId: string }) => ercApi.select(journeyId, type, poolItemId),
    journeyId,
    type,
  );
}

export function useUpdateErcStatus(journeyId: string, type: ErcType) {
  return useErcMutation(
    ({ itemId, status }: { itemId: string; status: string }) => ercApi.updateStatus(journeyId, type, itemId, status),
    journeyId,
    type,
  );
}

export function useDeactivateErc(journeyId: string, type: ErcType) {
  return useErcMutation(
    ({ itemId }: { itemId: string }) => ercApi.deactivate(journeyId, type, itemId),
    journeyId,
    type,
  );
}

export function useReactivateErc(journeyId: string, type: ErcType) {
  return useErcMutation(
    ({ itemId }: { itemId: string }) => ercApi.reactivate(journeyId, type, itemId),
    journeyId,
    type,
  );
}

export function useRemoveErc(journeyId: string, type: ErcType) {
  return useErcMutation(
    ({ itemId }: { itemId: string }) => ercApi.remove(journeyId, type, itemId),
    journeyId,
    type,
  );
}

// ─── Checkin hooks ──────────────────────────────────────────────────────────

export function useCheckins(journeyId: string, resolutionId: string) {
  return useQuery({
    queryKey: queryKeys.checkins.list(journeyId, resolutionId),
    queryFn: () => checkinsApi.listCheckins(journeyId, resolutionId),
    enabled: !!journeyId && !!resolutionId,
  });
}

export function useLogCheckin(journeyId: string, resolutionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note }: { status: CheckinStatus; note?: string }) =>
      checkinsApi.logCheckin(journeyId, resolutionId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.list(journeyId, resolutionId) });
    },
  });
}
