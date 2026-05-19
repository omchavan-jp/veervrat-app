'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth, useCompleteOnboarding } from '@/hooks/use-auth';
import { onboardingSchema, type OnboardingInput } from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const completeOnboarding = useCompleteOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: user?.name ?? '',
    },
  });

  useEffect(() => {
    if (user?.onboardingCompletedAt) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const onSubmit = (data: OnboardingInput) => {
    completeOnboarding.mutate(data);
  };

  const apiError =
    completeOnboarding.error instanceof ApiError
      ? completeOnboarding.error.message
      : completeOnboarding.error?.message;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Veervrat</CardTitle>
            <CardDescription>
              Let's set up your profile to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiError && (
              <Alert variant="destructive">
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={completeOnboarding.isPending}
              >
                {completeOnboarding.isPending ? 'Setting up...' : 'Complete setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
