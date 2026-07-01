'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testsApi } from '@/lib/api/tests';
import { queryKeys } from '@/lib/api/query-keys';

export function useTest(testId: string) {
  return useQuery({
    queryKey: queryKeys.tests.detail(testId),
    queryFn: () => testsApi.getTest(testId),
    enabled: !!testId,
    // Always re-check on mount so back/forward navigation into a test reflects its
    // true submitted/draft state (a stale cached draft would otherwise let a user
    // re-enter and "answer" an already-submitted test).
    refetchOnMount: 'always',
  });
}

export function useCreateTest() {
  return useMutation({
    mutationFn: testsApi.createOrResume,
    // Don't cache draft creation response into tests.detail — the shapes differ
    // (draft response has no answers array). useTest() will fetch fresh from GET /tests/:id.
  });
}

export function useSaveAnswers(testId: string) {
  return useMutation({
    mutationFn: (answers: { sentenceId: string; score: number }[]) =>
      testsApi.saveAnswers(testId, answers),
  });
}

export function useSubmitTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testsApi.submit,
    onSuccess: (_data, testId) => {
      // Mark the cached test as submitted so the test/preview draft-guards fire on any
      // subsequent back/forward navigation instead of showing a stale editable draft.
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.detail(testId) });
    },
  });
}

export function useTestReport(testId: string) {
  return useQuery({
    queryKey: queryKeys.tests.report(testId),
    queryFn: () => testsApi.report(testId),
    enabled: !!testId,
    staleTime: Infinity, // reports don't change after submission
  });
}
