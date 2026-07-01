'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api/client';
import { useAuth, useCompleteFramework } from '@/hooks/use-auth';

type Section = 'section1' | 'section2' | 'cta';

export default function FrameworkOnboardingPage() {
  const t = useTranslations('onboarding.framework');
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('section1');

  useEffect(() => {
    if (isLoading) return;
    // Already fully onboarded → app.
    if (user && user.onboardingCompletedAt !== null) {
      router.replace('/dashboard');
      return;
    }
    // Reached framework without finishing account setup → go back to step 1.
    if (!user || user.accountSetupCompletedAt === null) {
      router.replace('/onboarding/account-setup');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.accountSetupCompletedAt === null || user.onboardingCompletedAt !== null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Step indicator mirrors account-setup so onboarding progress reads consistently. */}
        <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          {t('stepIndicator', { current: 2, total: 2 })}
        </div>
        {section === 'section1' && <Section1 t={t} onNext={() => setSection('section2')} />}
        {section === 'section2' && (
          <Section2 t={t} onBack={() => setSection('section1')} onNext={() => setSection('cta')} />
        )}
        {section === 'cta' && (
          <CtaScreen t={t} onBack={() => setSection('section2')} />
        )}
      </div>
    </div>
  );
}

function Section1({ t, onNext }: { t: ReturnType<typeof useTranslations<'onboarding.framework'>>; onNext: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          {t('section1Eyebrow')}
        </div>
        <h1 className="mb-6 font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
          {t('section1Title')}
        </h1>
        <p className="text-[16px] leading-relaxed text-muted">{t('section1Philosophy')}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-3 font-display text-[20px] tracking-tight">{t('section1StanceTitle')}</h2>
        <p className="text-[15px] leading-relaxed text-muted">{t('section1StanceBody')}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-3 font-display text-[20px] tracking-tight">{t('section1VmTitle')}</h2>
        <p className="text-[15px] leading-relaxed text-muted">{t('section1VmBody')}</p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          className="h-auto rounded-xl bg-accent px-8 py-3 text-[15px] text-bg hover:bg-accent-hover"
        >
          {t('next')}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4'] as const;

function Section2({
  t,
  onBack,
  onNext,
}: {
  t: ReturnType<typeof useTranslations<'onboarding.framework'>>;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          {t('section2Eyebrow')}
        </div>
        <h1 className="mb-6 font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
          {t('section2Title')}
        </h1>
      </div>

      <div className="space-y-4">
        {STAGES.map((stage, i) => (
          <div key={stage} className="flex gap-4 rounded-xl border border-border bg-surface p-5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[13px] font-medium text-accent">
              {i + 1}
            </div>
            <div>
              <h3 className="mb-1 font-display text-[17px] tracking-tight">
                {t(`${stage}Title` as Parameters<typeof t>[0])}
              </h3>
              <p className="text-[14px] leading-relaxed text-muted">
                {t(`${stage}Body` as Parameters<typeof t>[0])}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-auto rounded-xl border-border-strong bg-surface px-8 py-3 text-[15px] text-fg hover:bg-bg"
        >
          <ArrowLeft aria-hidden="true" />
          {t('back')}
        </Button>
        <Button
          onClick={onNext}
          className="h-auto rounded-xl bg-accent px-8 py-3 text-[15px] text-bg hover:bg-accent-hover"
        >
          {t('next')}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function CtaScreen({
  t,
  onBack,
}: {
  t: ReturnType<typeof useTranslations<'onboarding.framework'>>;
  onBack: () => void;
}) {
  const router = useRouter();
  const completeFramework = useCompleteFramework();

  // Mark onboarding fully complete (grants app access), then go to the chosen destination.
  const finish = (destination: string) => {
    completeFramework.mutate(undefined, {
      onSuccess: () => router.push(destination),
    });
  };

  // Surface a failed completion so the user is not stranded on re-enabled buttons
  // with no explanation and no navigation.
  const completeError =
    completeFramework.error instanceof ApiError
      ? completeFramework.error.message
      : completeFramework.error?.message ?? null;

  return (
    <div className="space-y-8 text-center">
      <div>
        <h1 className="mb-4 font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
          {t('ctaTitle')}
        </h1>
        <p className="text-[16px] leading-relaxed text-muted">{t('ctaBody')}</p>
      </div>

      {completeError && (
        <Alert
          variant="destructive"
          className="border-destructive/40 bg-destructive/10 text-left"
        >
          <AlertDescription className="text-destructive">{completeError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Button
          onClick={() => finish('/study')}
          loading={completeFramework.isPending}
          className="h-auto rounded-xl bg-accent px-8 py-4 text-[15px] text-bg hover:bg-accent-hover"
        >
          {completeFramework.isPending ? t('submitting') : t('ctaTakeTest')}
        </Button>
        <Button
          variant="outline"
          onClick={() => finish('/dashboard')}
          disabled={completeFramework.isPending}
          className="h-auto rounded-xl border-border-strong bg-surface px-8 py-4 text-[15px] text-fg hover:bg-bg"
        >
          {t('ctaExplore')}
        </Button>
      </div>

      <div className="pt-2">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={completeFramework.isPending}
          className="h-auto px-3 py-1.5 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" />
          {t('back')}
        </Button>
      </div>
    </div>
  );
}
