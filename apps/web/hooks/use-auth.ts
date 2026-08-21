'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { User } from '@/lib/api/auth';
import { setLocaleCookie } from '@/lib/locale';
import { queryKeys } from '@/lib/api/query-keys';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    // A 401 is not a failure — it is the answer "nobody is signed in". Returning null makes it
    // a SUCCESSFUL result, which matters for more than tidiness: an errored query is refetched
    // on every fresh mount regardless of staleTime.
    //
    // That fuelled a request storm — ~200 calls a second until the rate limiter intervened,
    // measured at 1311 in 8 seconds. The layouts used to unmount their children while auth
    // loaded, so when loading ended the children mounted, a second useAuth consumer
    // subscribed, the errored query refetched, loading resumed, and the children unmounted
    // again.
    //
    // Those loading branches are gone (auth is now seeded server-side), so the loop cannot
    // form the same way today. This stays because it removes the *fuel* rather than one
    // arrangement of it: any future conditional render around an auth-gated subtree would
    // otherwise light it again.
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) return null;
        throw err;
      }
    },
    retry: false,
    // Belt and braces for the genuine-error case (network, 500): do not refetch merely because
    // a new component subscribed.
    retryOnMount: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
      // The account's saved language wins at the moment of signing in, overwriting whatever
      // the visitor picked while anonymous. Logging in is the point where a stated preference
      // becomes known, so it is honoured; any toggle afterwards is deliberate and sticks.
      //
      // This also matters on a shared device: the cookie lives a year, so without this the
      // previous person's choice would silently follow the next account signed in here.
      if (user.language) {
        setLocaleCookie(user.language);
      }
      router.push(user.onboardingCompletedAt ? '/dashboard' : '/onboarding');
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: authApi.verifyEmail,
  });
}

export function useLinkGoogle() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.linkGoogle,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
      router.push(user.onboardingCompletedAt ? '/dashboard' : '/onboarding');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      authApi.resetPassword(data),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.completeOnboarding,
    onSuccess: (user: User) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
      router.push('/onboarding/framework');
    },
  });
}

// Step 2: marks the framework walkthrough complete (grants app access). The caller
// triggers navigation to the chosen destination once the cache is updated.
export function useCompleteFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.completeFramework,
    onSuccess: (user: User) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
  });
}
