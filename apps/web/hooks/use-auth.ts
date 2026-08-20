'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import type { User } from '@/lib/api/auth';
import { setLocaleCookie } from '@/lib/locale';
import { queryKeys } from '@/lib/api/query-keys';

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.getMe,
    retry: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user && !error,
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
